/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  UiSettingsServiceStart,
  ILegacyCustomClusterClient,
  Logger,
  IUiSettingsClient,
  LegacyCallAPIOptions,
} from 'kibana/server';
import { i18n } from '@kbn/i18n';
import {
  AlertType,
  AlertExecutorOptions,
  AlertInstance,
  AlertsClient,
  AlertServices,
} from '../../../alerts/server';
import { Alert, RawAlertInstance } from '../../../alerts/common';
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
  CommonBaseAlert,
} from '../../common/types/alerts';
import { fetchAvailableCcs } from '../lib/alerts/fetch_available_ccs';
import { fetchClusters } from '../lib/alerts/fetch_clusters';
import { getCcsIndexPattern } from '../lib/alerts/get_ccs_index_pattern';
import { INDEX_PATTERN_ELASTICSEARCH } from '../../common/constants';
import { MonitoringConfig } from '../config';
import { AlertSeverity } from '../../common/enums';
import { MonitoringLicenseService } from '../types';
import { mbSafeQuery } from '../lib/mb_safe_query';
import { appendMetricbeatIndex } from '../lib/alerts/append_mb_index';

export class BaseAlert {
  public type!: string;
  public label!: string;
  public description!: string;
  public defaultThrottle: string = '1d';
  public defaultInterval: string = '1m';
  public rawAlert: Alert | undefined;
  public isLegacy: boolean = false;

  protected getUiSettingsService!: () => Promise<UiSettingsServiceStart>;
  protected monitoringCluster!: ILegacyCustomClusterClient;
  protected getLogger!: (...scopes: string[]) => Logger;
  protected config!: MonitoringConfig;
  protected kibanaUrl!: string;
  protected isCloud: boolean = false;
  protected defaultParams: CommonAlertParams | {} = {};
  public get paramDetails() {
    return {};
  }
  protected actionVariables: Array<{ name: string; description: string }> = [];
  protected alertType!: AlertType;

  constructor(rawAlert: Alert | undefined = undefined) {
    if (rawAlert) {
      this.rawAlert = rawAlert;
    }
  }

  public serialize(): CommonBaseAlert | null {
    if (!this.rawAlert) {
      return null;
    }

    return {
      type: this.type,
      label: this.label,
      rawAlert: this.rawAlert,
      paramDetails: this.paramDetails,
      isLegacy: this.isLegacy,
    };
  }

  public initializeAlertType(
    getUiSettingsService: () => Promise<UiSettingsServiceStart>,
    monitoringCluster: ILegacyCustomClusterClient,
    getLogger: (...scopes: string[]) => Logger,
    config: MonitoringConfig,
    kibanaUrl: string,
    isCloud: boolean
  ) {
    this.getUiSettingsService = getUiSettingsService;
    this.monitoringCluster = monitoringCluster;
    this.config = config;
    this.kibanaUrl = kibanaUrl;
    this.getLogger = getLogger;
    this.isCloud = isCloud;
  }

  public getAlertType(): AlertType {
    return {
      id: this.type,
      name: this.label,
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
        context: this.actionVariables,
      },
    };
  }

  public isEnabled(licenseService: MonitoringLicenseService) {
    if (this.isLegacy) {
      const watcherFeature = licenseService.getWatcherFeature();
      if (!watcherFeature.isAvailable || !watcherFeature.isEnabled) {
        return false;
      }
    }
    return true;
  }

  public getId() {
    return this.rawAlert ? this.rawAlert.id : null;
  }

  public async createIfDoesNotExist(
    alertsClient: AlertsClient,
    actionsClient: ActionsClient,
    actions: AlertEnableAction[]
  ): Promise<Alert> {
    const existingAlertData = await alertsClient.find({
      options: {
        search: this.type,
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
          // This is just a server log right now, but will get more robut over time
          message: this.getDefaultActionMessage(true),
          ...actionData.config,
        },
      });
    }

    return await alertsClient.create({
      data: {
        enabled: true,
        tags: [],
        params: this.defaultParams,
        consumer: 'monitoring',
        name: this.label,
        alertTypeId: this.type,
        throttle: this.defaultThrottle,
        notifyOnlyOnActionGroupChange: false,
        schedule: { interval: this.defaultInterval },
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
    const logger = this.getLogger(this.type);
    logger.debug(
      `Executing alert with params: ${JSON.stringify(params)} and state: ${JSON.stringify(state)}`
    );

    const _callCluster = this.monitoringCluster
      ? this.monitoringCluster.callAsInternalUser
      : services.callCluster;
    const callCluster = async (
      endpoint: string,
      clientParams?: Record<string, unknown>,
      options?: LegacyCallAPIOptions
    ) => {
      return await mbSafeQuery(async () => _callCluster(endpoint, clientParams, options));
    };
    const availableCcs = this.config.ui.ccs.enabled ? await fetchAvailableCcs(callCluster) : [];
    const clusters = await this.fetchClusters(callCluster, availableCcs, params);
    const uiSettings = (await this.getUiSettingsService()).asScopedToClient(
      services.savedObjectsClient
    );

    const data = await this.fetchData(params, callCluster, clusters, uiSettings, availableCcs);
    return await this.processData(data, clusters, services, logger, state);
  }

  protected async fetchClusters(
    callCluster: any,
    availableCcs: string[] | undefined = undefined,
    params: CommonAlertParams
  ) {
    let ccs;
    if (!availableCcs) {
      ccs = this.config.ui.ccs.enabled ? await fetchAvailableCcs(callCluster) : undefined;
    } else {
      ccs = availableCcs;
    }
    // Support CCS use cases by querying to find available remote clusters
    // and then adding those to the index pattern we are searching against
    let esIndexPattern = appendMetricbeatIndex(this.config, INDEX_PATTERN_ELASTICSEARCH);
    if (ccs) {
      esIndexPattern = getCcsIndexPattern(esIndexPattern, ccs);
    }
    return await fetchClusters(callCluster, esIndexPattern);
  }

  protected async fetchData(
    params: CommonAlertParams | unknown,
    callCluster: any,
    clusters: AlertCluster[],
    uiSettings: IUiSettingsClient,
    availableCcs: string[]
  ): Promise<Array<AlertData & unknown>> {
    // Child should implement
    throw new Error('Child classes must implement `fetchData`');
  }

  protected async processData(
    data: Array<AlertData & unknown>,
    clusters: AlertCluster[],
    services: AlertServices,
    logger: Logger,
    instanceState: unknown
  ): Promise<void | Record<string, any>> {
    for (const item of data) {
      const cluster = clusters.find((c: AlertCluster) => c.clusterUuid === item.clusterUuid);
      if (!cluster) {
        logger.warn(`Unable to find cluster for clusterUuid='${item.clusterUuid}'`);
        continue;
      }

      const instance = services.alertInstanceFactory(`${this.type}:${item.instanceKey}`);
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
        logger.debug(`${this.type} is firing`);
        alertState.ui.triggeredMS = +new Date();
        alertState.ui.isFiring = true;
        alertState.ui.message = this.getUiMessage(alertState, item);
        alertState.ui.severity = item.severity;
        alertState.ui.resolvedMS = 0;
        shouldExecuteActions = true;
      } else if (!item.shouldFire && alertState.ui.isFiring) {
        logger.debug(`${this.type} is not firing anymore`);
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

  public getDefaultActionMessage(forDefaultServerLog: boolean): string {
    return forDefaultServerLog
      ? '{{context.internalShortMessage}}'
      : '{{context.internalFullMessage}}';
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
    return `${this.kibanaUrl}/app/monitoring#/${link}?_g=(${globalState.toString()})`;
  }
}
