/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger, LegacyCallAPIOptions } from 'kibana/server';
import { i18n } from '@kbn/i18n';
import {
  AlertType,
  AlertExecutorOptions,
  AlertInstance,
  AlertsClient,
  AlertServices,
} from '../../../alerts/server';
import { Alert, AlertTypeParams, RawAlertInstance, SanitizedAlert } from '../../../alerts/common';
import { ActionsClient } from '../../../actions/server';
import {
  AlertState,
  AlertNodeState,
  AlertCluster,
  AlertMessage,
  AlertData,
  AlertInstanceState,
  AlertEnableAction,
  CommonAlertFilter,
  CommonAlertParams,
  LegacyAlert,
} from '../../common/types/alerts';
import { fetchAvailableCcs } from '../lib/alerts/fetch_available_ccs';
import { fetchClusters } from '../lib/alerts/fetch_clusters';
import { getCcsIndexPattern } from '../lib/alerts/get_ccs_index_pattern';
import { INDEX_PATTERN_ELASTICSEARCH, INDEX_ALERTS } from '../../common/constants';
import { AlertSeverity } from '../../common/enums';
import { MonitoringLicenseService } from '../types';
import { mbSafeQuery } from '../lib/mb_safe_query';
import { appendMetricbeatIndex } from '../lib/alerts/append_mb_index';
import { parseDuration } from '../../../alerts/common/parse_duration';
import { Globals } from '../static_globals';
import { fetchLegacyAlerts } from '../lib/alerts/fetch_legacy_alerts';
import { mapLegacySeverity } from '../lib/alerts/map_legacy_severity';

interface LegacyOptions {
  watchName: string;
  nodeNameLabel: string;
  changeDataValues?: Partial<AlertData>;
}

type ExecutedState =
  | {
      lastChecked: number;
      lastExecutedAction: number;
      [key: string]: unknown;
    }
  | Record<string, any>;

interface AlertOptions {
  id: string;
  name: string;
  throttle?: string | null;
  interval?: string;
  legacy?: LegacyOptions;
  defaultParams?: CommonAlertParams;
  actionVariables: Array<{ name: string; description: string }>;
  fetchClustersRange?: number;
  accessorKey?: string;
}

type CallCluster = (
  endpoint: string,
  clientParams?: Record<string, unknown> | undefined,
  options?: LegacyCallAPIOptions | undefined
) => Promise<any>;

const defaultAlertOptions = (): AlertOptions => {
  return {
    id: '',
    name: '',
    throttle: '1d',
    interval: '1m',
    defaultParams: { threshold: 85, duration: '1h' },
    actionVariables: [],
  };
};
export class BaseAlert {
  protected scopedLogger: Logger;

  constructor(
    public rawAlert?: SanitizedAlert,
    public alertOptions: AlertOptions = defaultAlertOptions()
  ) {
    this.alertOptions = { ...defaultAlertOptions(), ...this.alertOptions };
    this.scopedLogger = Globals.app.getLogger(alertOptions.id!);
  }

  public getAlertType(): AlertType<never, never, never, never, 'default'> {
    const { id, name, actionVariables } = this.alertOptions;
    return {
      id,
      name,
      actionGroups: [
        {
          id: 'default',
          name: i18n.translate('xpack.monitoring.alerts.actionGroups.default', {
            defaultMessage: 'Default',
          }),
        },
      ],
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      executor: (
        options: AlertExecutorOptions<never, never, AlertInstanceState, never, 'default'> & {
          state: ExecutedState;
        }
      ): Promise<any> => this.execute(options),
      producer: 'monitoring',
      actionVariables: {
        context: actionVariables,
      },
    };
  }

  public isEnabled(licenseService: MonitoringLicenseService) {
    if (this.alertOptions.legacy) {
      const watcherFeature = licenseService.getWatcherFeature();
      if (!watcherFeature.isAvailable || !watcherFeature.isEnabled) {
        return false;
      }
    }
    return true;
  }

  public getId() {
    return this.rawAlert?.id;
  }

  public async createIfDoesNotExist(
    alertsClient: AlertsClient,
    actionsClient: ActionsClient,
    actions: AlertEnableAction[]
  ): Promise<Alert<AlertTypeParams>> {
    const existingAlertData = await alertsClient.find({
      options: {
        search: this.alertOptions.id,
      },
    });

    if (existingAlertData.total > 0) {
      const existingAlert = existingAlertData.data[0] as Alert;
      return existingAlert;
    }

    const alertActions = [];
    for (const actionData of actions) {
      const action = await actionsClient.get({ id: actionData.id });
      if (!action) {
        continue;
      }
      alertActions.push({
        group: 'default',
        id: actionData.id,
        params: {
          message: '{{context.internalShortMessage}}',
          ...actionData.config,
        },
      });
    }

    const {
      defaultParams: params = {},
      name,
      id: alertTypeId,
      throttle = '1d',
      interval = '1m',
    } = this.alertOptions;
    return await alertsClient.create<AlertTypeParams>({
      data: {
        enabled: true,
        tags: [],
        params,
        consumer: 'monitoring',
        name,
        alertTypeId,
        throttle,
        notifyWhen: null,
        schedule: { interval },
        actions: alertActions,
      },
    });
  }

  public async getStates(
    alertsClient: AlertsClient,
    id: string,
    filters: CommonAlertFilter[]
  ): Promise<{ [instanceId: string]: RawAlertInstance }> {
    const states = await alertsClient.getAlertState({ id });
    if (!states || !states.alertInstances) {
      return {};
    }

    return Object.keys(states.alertInstances).reduce(
      (accum: { [instanceId: string]: RawAlertInstance }, instanceId) => {
        if (!states.alertInstances) {
          return accum;
        }
        const alertInstance: RawAlertInstance = states.alertInstances[instanceId];
        const filteredAlertInstance = this.filterAlertInstance(alertInstance, filters);
        if (filteredAlertInstance) {
          accum[instanceId] = filteredAlertInstance as RawAlertInstance;
          if (filteredAlertInstance.state) {
            accum[instanceId].state = {
              alertStates: (filteredAlertInstance.state as AlertInstanceState).alertStates,
            };
          }
        }
        return accum;
      },
      {}
    );
  }

  protected filterAlertInstance(
    alertInstance: RawAlertInstance,
    filters: CommonAlertFilter[],
    filterOnNodes: boolean = false
  ) {
    if (!filterOnNodes) {
      return alertInstance;
    }
    const alertInstanceStates = alertInstance.state?.alertStates as AlertNodeState[];
    const nodeFilter = filters?.find((filter) => filter.nodeUuid);
    if (!filters || !filters.length || !alertInstanceStates?.length || !nodeFilter?.nodeUuid) {
      return alertInstance;
    }
    const alertStates = alertInstanceStates.filter(({ nodeId }) => nodeId === nodeFilter.nodeUuid);
    return { state: { alertStates } };
  }

  protected async execute({
    services,
    params,
    state,
  }: AlertExecutorOptions<never, never, AlertInstanceState, never, 'default'> & {
    state: ExecutedState;
  }): Promise<any> {
    this.scopedLogger.debug(
      `Executing alert with params: ${JSON.stringify(params)} and state: ${JSON.stringify(state)}`
    );

    const useCallCluster =
      Globals.app.monitoringCluster?.callAsInternalUser || services.callCluster;
    const callCluster = async (
      endpoint: string,
      clientParams?: Record<string, unknown>,
      options?: LegacyCallAPIOptions
    ) => {
      return await mbSafeQuery(async () => useCallCluster(endpoint, clientParams, options));
    };
    const availableCcs = Globals.app.config.ui.ccs.enabled
      ? await fetchAvailableCcs(callCluster)
      : [];
    const clusters = await this.fetchClusters(
      callCluster,
      params as CommonAlertParams,
      availableCcs
    );
    if (this.alertOptions.legacy) {
      const data = await this.fetchLegacyData(callCluster, clusters, availableCcs);
      return await this.processLegacyData(data, clusters, services, state);
    }
    const data = await this.fetchData(params, callCluster, clusters, availableCcs);
    return await this.processData(data, clusters, services, state);
  }

  protected async fetchClusters(
    callCluster: CallCluster,
    params: CommonAlertParams,
    ccs?: string[]
  ) {
    let esIndexPattern = appendMetricbeatIndex(Globals.app.config, INDEX_PATTERN_ELASTICSEARCH);
    if (ccs?.length) {
      esIndexPattern = getCcsIndexPattern(esIndexPattern, ccs);
    }
    if (!params.limit) {
      return await fetchClusters(callCluster, esIndexPattern);
    }
    const limit = parseDuration(params.limit);
    const rangeFilter = this.alertOptions.fetchClustersRange
      ? {
          timestamp: {
            format: 'epoch_millis',
            gte: limit - this.alertOptions.fetchClustersRange,
          },
        }
      : undefined;
    return await fetchClusters(callCluster, esIndexPattern, rangeFilter);
  }

  protected async fetchData(
    params: CommonAlertParams | unknown,
    callCluster: CallCluster,
    clusters: AlertCluster[],
    availableCcs: string[]
  ): Promise<Array<AlertData & unknown>> {
    throw new Error('Child classes must implement `fetchData`');
  }

  protected async fetchLegacyData(
    callCluster: CallCluster,
    clusters: AlertCluster[],
    availableCcs: string[]
  ): Promise<AlertData[]> {
    let alertIndexPattern = INDEX_ALERTS;
    if (availableCcs) {
      alertIndexPattern = getCcsIndexPattern(alertIndexPattern, availableCcs);
    }
    const legacyAlerts = await fetchLegacyAlerts(
      callCluster,
      clusters,
      alertIndexPattern,
      this.alertOptions.legacy!.watchName,
      Globals.app.config.ui.max_bucket_size
    );

    return legacyAlerts.map((legacyAlert) => {
      return {
        clusterUuid: legacyAlert.metadata.cluster_uuid,
        shouldFire: !legacyAlert.resolved_timestamp,
        severity: mapLegacySeverity(legacyAlert.metadata.severity),
        meta: legacyAlert,
        nodeName: this.alertOptions.legacy!.nodeNameLabel,
        ...this.alertOptions.legacy!.changeDataValues,
      };
    });
  }

  protected async processData(
    data: AlertData[],
    clusters: AlertCluster[],
    services: AlertServices<AlertInstanceState, never, 'default'>,
    state: ExecutedState
  ) {
    const currentUTC = +new Date();
    for (const cluster of clusters) {
      const nodes = data.filter((node) => node.clusterUuid === cluster.clusterUuid);
      if (!nodes.length) {
        continue;
      }

      const firingNodeUuids = nodes
        .filter((node) => node.shouldFire)
        .map((node) => node.meta.nodeId || node.meta.instanceId)
        .join(',');
      const instanceId = `${this.alertOptions.id}:${cluster.clusterUuid}:${firingNodeUuids}`;
      const instance = services.alertInstanceFactory(instanceId);
      const newAlertStates: AlertNodeState[] = [];
      const key = this.alertOptions.accessorKey;
      for (const node of nodes) {
        if (!node.shouldFire) {
          continue;
        }
        const { meta } = node;
        const nodeState = this.getDefaultAlertState(cluster, node) as AlertNodeState;
        if (key) {
          nodeState[key] = meta[key];
        }
        nodeState.nodeId = meta.nodeId || node.nodeId! || meta.instanceId;
        // TODO: make these functions more generic, so it's node/item agnostic
        nodeState.nodeName = meta.itemLabel || meta.nodeName || node.nodeName || nodeState.nodeId;
        nodeState.itemLabel = meta.itemLabel;
        nodeState.meta = meta;
        nodeState.ui.triggeredMS = currentUTC;
        nodeState.ui.isFiring = true;
        nodeState.ui.severity = node.severity;
        nodeState.ui.message = this.getUiMessage(nodeState, node);
        newAlertStates.push(nodeState);
      }

      const alertInstanceState = { alertStates: newAlertStates };
      instance.replaceState(alertInstanceState);
      if (newAlertStates.length) {
        this.executeActions(instance, alertInstanceState, null, cluster);
        state.lastExecutedAction = currentUTC;
      }
    }

    state.lastChecked = currentUTC;
    return state;
  }

  protected async processLegacyData(
    data: AlertData[],
    clusters: AlertCluster[],
    services: AlertServices<AlertInstanceState, never, 'default'>,
    state: ExecutedState
  ) {
    const currentUTC = +new Date();
    for (const item of data) {
      const instanceId = `${this.alertOptions.id}:${item.clusterUuid}`;
      const instance = services.alertInstanceFactory(instanceId);
      if (!item.shouldFire) {
        instance.replaceState({ alertStates: [] });
        continue;
      }
      const cluster = clusters.find((c: AlertCluster) => c.clusterUuid === item.clusterUuid);
      const alertState: AlertState = this.getDefaultAlertState(cluster!, item);
      alertState.nodeName = item.nodeName;
      alertState.ui.triggeredMS = currentUTC;
      alertState.ui.isFiring = true;
      alertState.ui.severity = item.severity;
      alertState.ui.message = this.getUiMessage(alertState, item);
      instance.replaceState({ alertStates: [alertState] });
      this.executeActions(instance, alertState, item, cluster);
    }
    state.lastChecked = currentUTC;
    return state;
  }

  protected getDefaultAlertState(cluster: AlertCluster, item: AlertData): AlertState {
    return {
      cluster,
      ccs: item.ccs,
      ui: {
        isFiring: false,
        message: null,
        severity: AlertSeverity.Success,
        triggeredMS: 0,
        lastCheckedMS: 0,
      },
    };
  }

  protected getVersions(legacyAlert: LegacyAlert) {
    return `[${legacyAlert.message.match(/(?<=Versions: \[).+?(?=\])/)}]`;
  }

  protected getUiMessage(
    alertState: AlertState | unknown,
    item: AlertData | unknown
  ): AlertMessage {
    throw new Error('Child classes must implement `getUiMessage`');
  }

  protected executeActions(
    instance: AlertInstance,
    instanceState: AlertInstanceState | AlertState | unknown,
    item: AlertData | unknown,
    cluster?: AlertCluster | unknown
  ) {
    throw new Error('Child classes must implement `executeActions`');
  }

  protected createGlobalStateLink(link: string, clusterUuid: string, ccs?: string) {
    const globalState = [`cluster_uuid:${clusterUuid}`];
    if (ccs) {
      globalState.push(`ccs:${ccs}`);
    }
    return `${Globals.app.url}/app/monitoring#/${link}?_g=(${globalState.toString()})`;
  }
}
