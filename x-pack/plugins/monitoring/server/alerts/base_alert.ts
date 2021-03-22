/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, ElasticsearchClient } from 'kibana/server';
import { i18n } from '@kbn/i18n';
import {
  AlertType,
  AlertExecutorOptions,
  AlertInstance,
  AlertsClient,
  AlertServices,
} from '../../../alerting/server';
import { Alert, AlertTypeParams, RawAlertInstance, SanitizedAlert } from '../../../alerting/common';
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
} from '../../common/types/alerts';
import { fetchAvailableCcs } from '../lib/alerts/fetch_available_ccs';
import { fetchClusters } from '../lib/alerts/fetch_clusters';
import { getCcsIndexPattern } from '../lib/alerts/get_ccs_index_pattern';
import { INDEX_PATTERN_ELASTICSEARCH } from '../../common/constants';
import { AlertSeverity } from '../../common/enums';
import { appendMetricbeatIndex } from '../lib/alerts/append_mb_index';
import { parseDuration } from '../../../alerting/common/parse_duration';
import { Globals } from '../static_globals';

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
  defaultParams?: Partial<CommonAlertParams>;
  actionVariables: Array<{ name: string; description: string }>;
  fetchClustersRange?: number;
  accessorKey?: string;
}

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
    const defaultOptions = defaultAlertOptions();
    defaultOptions.defaultParams = {
      ...defaultOptions.defaultParams,
      ...this.alertOptions.defaultParams,
    };
    this.alertOptions = { ...defaultOptions, ...this.alertOptions };
    this.scopedLogger = Globals.app.getLogger(alertOptions.id);
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

    const esClient = services.scopedClusterClient.asCurrentUser;
    const availableCcs = Globals.app.config.ui.ccs.enabled ? await fetchAvailableCcs(esClient) : [];
    const clusters = await this.fetchClusters(esClient, params as CommonAlertParams, availableCcs);
    const data = await this.fetchData(params, esClient, clusters, availableCcs);
    return await this.processData(data, clusters, services, state);
  }

  protected async fetchClusters(
    esClient: ElasticsearchClient,
    params: CommonAlertParams,
    ccs?: string[]
  ) {
    let esIndexPattern = appendMetricbeatIndex(Globals.app.config, INDEX_PATTERN_ELASTICSEARCH);
    if (ccs?.length) {
      esIndexPattern = getCcsIndexPattern(esIndexPattern, ccs);
    }
    if (!params.limit) {
      return await fetchClusters(esClient, esIndexPattern);
    }
    const limit = parseDuration(params.limit);
    const rangeFilter = this.alertOptions.fetchClustersRange
      ? {
          timestamp: {
            format: 'epoch_millis',
            gte: +new Date() - limit - this.alertOptions.fetchClustersRange,
          },
        }
      : undefined;
    return await fetchClusters(esClient, esIndexPattern, rangeFilter);
  }

  protected async fetchData(
    params: CommonAlertParams | unknown,
    esClient: ElasticsearchClient,
    clusters: AlertCluster[],
    availableCcs: string[]
  ): Promise<Array<AlertData & unknown>> {
    throw new Error('Child classes must implement `fetchData`');
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
