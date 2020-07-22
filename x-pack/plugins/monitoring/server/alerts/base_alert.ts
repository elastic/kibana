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
} from './types';
import { fetchAvailableCcs } from '../lib/alerts/fetch_available_ccs';
import { fetchClusters } from '../lib/alerts/fetch_clusters';
import { getCcsIndexPattern } from '../lib/alerts/get_ccs_index_pattern';
import { INDEX_PATTERN_ELASTICSEARCH } from '../../common/constants';
import { MonitoringConfig } from '../config';
import { AlertSeverity } from '../../common/enums';
import { CommonAlertFilter, CommonAlertParams, CommonBaseAlert } from '../../common/types';
import { MonitoringLicenseService } from '../types';

export class BaseAlert {
  public type!: string;
  public label!: string;
  public defaultThrottle: string = '1d';
  public defaultInterval: string = '1m';
  public rawAlert: Alert | undefined;
  public isLegacy: boolean = false;

  protected getUiSettingsService!: () => Promise<UiSettingsServiceStart>;
  protected monitoringCluster!: ILegacyCustomClusterClient;
  protected getLogger!: (...scopes: string[]) => Logger;
  protected config!: MonitoringConfig;
  protected kibanaUrl!: string;
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
    kibanaUrl: string
  ) {
    this.getUiSettingsService = getUiSettingsService;
    this.monitoringCluster = monitoringCluster;
    this.config = config;
    this.kibanaUrl = kibanaUrl;
    this.getLogger = getLogger;
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
        }
        return accum;
      },
      {}
    );
  }

  protected filterAlertInstance(alertInstance: RawAlertInstance, filters: CommonAlertFilter[]) {
    return true;
  }

  protected async execute({ services, params, state }: AlertExecutorOptions): Promise<any> {
    const logger = this.getLogger(this.type);
    logger.debug(
      `Executing alert with params: ${JSON.stringify(params)} and state: ${JSON.stringify(state)}`
    );

    const callCluster = this.monitoringCluster
      ? this.monitoringCluster.callAsInternalUser
      : services.callCluster;
    const availableCcs = this.config.ui.ccs.enabled ? await fetchAvailableCcs(callCluster) : [];
    // Support CCS use cases by querying to find available remote clusters
    // and then adding those to the index pattern we are searching against
    let esIndexPattern = INDEX_PATTERN_ELASTICSEARCH;
    if (availableCcs) {
      esIndexPattern = getCcsIndexPattern(esIndexPattern, availableCcs);
    }
    const clusters = await fetchClusters(callCluster, esIndexPattern);
    const uiSettings = (await this.getUiSettingsService()).asScopedToClient(
      services.savedObjectsClient
    );

    const data = await this.fetchData(params, callCluster, clusters, uiSettings, availableCcs);
    this.processData(data, clusters, services, logger);
  }

  protected async fetchData(
    params: CommonAlertParams,
    callCluster: any,
    clusters: AlertCluster[],
    uiSettings: IUiSettingsClient,
    availableCcs: string[]
  ): Promise<AlertData[]> {
    // Child should implement
    throw new Error('Child classes must implement `fetchData`');
  }

  protected processData(
    data: AlertData[],
    clusters: AlertCluster[],
    services: AlertServices,
    logger: Logger
  ) {
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

  protected getUiMessage(alertState: AlertState, item: AlertData): AlertMessage {
    throw new Error('Child classes must implement `getUiMessage`');
  }

  protected executeActions(
    instance: AlertInstance,
    instanceState: AlertInstanceState,
    item: AlertData,
    cluster: AlertCluster
  ) {
    throw new Error('Child classes must implement `executeActions`');
  }
}
