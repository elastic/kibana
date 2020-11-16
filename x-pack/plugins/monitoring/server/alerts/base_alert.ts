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
import { Alert, RawAlertInstance, SanitizedAlert } from '../../../alerts/common';
import { ActionsClient } from '../../../actions/server';
import {
  AlertState,
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
import { MonitoringLicenseService } from '../types';
import { mbSafeQuery } from '../lib/mb_safe_query';
import { appendMetricbeatIndex } from '../lib/alerts/append_mb_index';
import { parseDuration } from '../../../alerts/common/parse_duration';

import { Globals } from '../static_globals';

interface AlertOptions {
  id: string;
  name: string;
  throttle?: string | null;
  interval?: string;
  isLegacy?: boolean;
  defaultParams?: CommonAlertParams;
  actionVariables: Array<{ name: string; description: string }>;
  fetchClustersRange?: number;
}

const defaultAlertOptions = (): AlertOptions => {
  return {
    id: '',
    name: '',
    throttle: '1d',
    interval: '1m',
    isLegacy: false,
    defaultParams: {},
    actionVariables: [],
  };
};
export class BaseAlert {
  protected scopedLogger: Logger;

  constructor(
    public rawAlert?: SanitizedAlert,
    public alertOptions: AlertOptions = defaultAlertOptions()
  ) {
    this.scopedLogger = Globals.app.getLogger(alertOptions.id!);
  }

  public getAlertType(): AlertType {
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
      executor: (options: AlertExecutorOptions): Promise<any> => this.execute(options),
      producer: 'monitoring',
      actionVariables: {
        context: actionVariables,
      },
    };
  }

  public isEnabled(licenseService: MonitoringLicenseService) {
    if (this.alertOptions.isLegacy) {
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
  ): Promise<Alert> {
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
    return await alertsClient.create({
      data: {
        enabled: true,
        tags: [],
        params,
        consumer: 'monitoring',
        name,
        alertTypeId,
        throttle,
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
        if (alertInstance && this.filterAlertInstance(alertInstance, filters)) {
          accum[instanceId] = alertInstance;
          if (alertInstance.state) {
            accum[instanceId].state = {
              alertStates: (alertInstance.state as AlertInstanceState).alertStates.filter(
                (alertState: AlertState) => {
                  return this.filterAlertState(alertState, filters);
                }
              ),
            };
          }
        }
        return accum;
      },
      {}
    );
  }

  protected filterAlertInstance(alertInstance: RawAlertInstance, filters: CommonAlertFilter[]) {
    return true;
  }

  protected filterAlertState(alertState: AlertState, filters: CommonAlertFilter[]) {
    return true;
  }

  protected async execute({ services, params, state }: AlertExecutorOptions): Promise<any> {
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
    const clusters = await this.fetchClusters(callCluster, availableCcs, params);

    const data = await this.fetchData(params, callCluster, clusters, availableCcs);
    return await this.processData(data, clusters, services, state);
  }

  protected async fetchClusters(
    callCluster: any,
    availableCCS: string[] | undefined,
    params: CommonAlertParams
  ) {
    const limit = parseDuration(params.limit as string);
    const ccs =
      availableCCS ||
      (Globals.app.config.ui.ccs.enabled ? await fetchAvailableCcs(callCluster) : undefined);
    let esIndexPattern = appendMetricbeatIndex(Globals.app.config, INDEX_PATTERN_ELASTICSEARCH);
    if (ccs) {
      esIndexPattern = getCcsIndexPattern(esIndexPattern, ccs);
    }
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
    callCluster: any,
    clusters: AlertCluster[],
    availableCcs: string[]
  ): Promise<Array<AlertData & unknown>> {
    // Child should implement
    throw new Error('Child classes must implement `fetchData`');
  }

  protected async processData(
    data: Array<AlertData & unknown>,
    clusters: AlertCluster[],
    services: AlertServices,
    instanceState: unknown
  ): Promise<void | Record<string, any>> {
    for (const item of data) {
      const cluster = clusters.find((c: AlertCluster) => c.clusterUuid === item.clusterUuid);
      if (!cluster) {
        this.scopedLogger.warn(`Unable to find cluster for clusterUuid='${item.clusterUuid}'`);
        continue;
      }

      const instance = services.alertInstanceFactory(`${this.alertOptions.id}:${item.instanceKey}`);
      const state = (instance.getState() as unknown) as AlertInstanceState;
      const alertInstanceState: AlertInstanceState = { alertStates: state?.alertStates || [] };
      let alertState: AlertState;
      const indexInState = this.findIndexInInstanceState(alertInstanceState, cluster);
      if (indexInState > -1) {
        alertState = state.alertStates[indexInState];
      } else {
        alertState = this.getDefaultAlertState(cluster, item);
      }

      let shouldExecuteActions = false;
      if (item.shouldFire) {
        this.scopedLogger.debug(`${this.alertOptions.name} is firing`);
        alertState.ui.triggeredMS = +new Date();
        alertState.ui.isFiring = true;
        alertState.ui.message = this.getUiMessage(alertState, item);
        alertState.ui.severity = item.severity;
        alertState.ui.resolvedMS = 0;
        shouldExecuteActions = true;
      } else if (!item.shouldFire && alertState.ui.isFiring) {
        this.scopedLogger.debug(`${this.alertOptions.name} is not firing anymore`);
        alertState.ui.isFiring = false;
        alertState.ui.resolvedMS = +new Date();
        alertState.ui.message = this.getUiMessage(alertState, item);
        shouldExecuteActions = true;
      }

      if (indexInState === -1) {
        alertInstanceState.alertStates.push(alertState);
      } else {
        alertInstanceState.alertStates = [
          ...alertInstanceState.alertStates.slice(0, indexInState),
          alertState,
          ...alertInstanceState.alertStates.slice(indexInState + 1),
        ];
      }

      instance.replaceState(alertInstanceState);
      if (shouldExecuteActions) {
        this.executeActions(instance, alertInstanceState, item, cluster);
      }
    }
  }

  protected findIndexInInstanceState(stateInstance: AlertInstanceState, cluster: AlertCluster) {
    return stateInstance.alertStates.findIndex(
      (alertState) => alertState.cluster.clusterUuid === cluster.clusterUuid
    );
  }

  protected getDefaultAlertState(cluster: AlertCluster, item: AlertData): AlertState {
    return {
      cluster,
      ccs: item.ccs,
      ui: {
        isFiring: false,
        message: null,
        severity: AlertSeverity.Success,
        resolvedMS: 0,
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
    instanceState: AlertInstanceState | unknown,
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
