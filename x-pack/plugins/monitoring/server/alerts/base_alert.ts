/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  UiSettingsServiceStart,
  ICustomClusterClient,
  Logger,
  IUiSettingsClient,
} from 'kibana/server';
import { pick } from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  AlertType,
  AlertExecutorOptions,
  AlertInstance,
  AlertsClient,
} from '../../../alerting/server';
import { Alert, AlertAction } from '../../../alerting/common';
import { ActionsClient } from '../../../actions/server';
import { AlertState, AlertCluster, AlertMessage, AlertData } from './types';
import { fetchAvailableCcs } from '../lib/alerts/fetch_available_ccs';
import { fetchClusters } from '../lib/alerts/fetch_clusters';
import { getCcsIndexPattern } from '../lib/alerts/get_ccs_index_pattern';
import {
  INDEX_PATTERN_ELASTICSEARCH,
  ALERT_ACTION_TYPE_LOG,
  ALERT_ACTION_TYPE_EMAIL,
} from '../../common/constants';
import { MonitoringConfig } from '../config';
import { AlertSeverity } from './enums';
import { ActionResult } from '../../../actions/common';

const DEFAULT_SERVER_LOG_NAME = 'Monitoring: Write to Kibana log';
const ALERTS_UPDATE_FIELDS = ['name', 'tags', 'schedule', 'params', 'throttle'];

export class BaseAlert {
  protected getUiSettingsService!: () => Promise<UiSettingsServiceStart>;
  protected monitoringCluster!: ICustomClusterClient;
  protected getLogger!: (...scopes: string[]) => Logger;
  protected config!: MonitoringConfig;
  protected kibanaUrl!: string;
  public type!: string;
  public label!: string;
  public throttle: string = '1m';
  public interval: string = '1m';
  protected alertType!: AlertType;
  public rawAlert: Alert | undefined;

  constructor(rawAlert: Alert | undefined = undefined) {
    if (rawAlert) {
      this.rawAlert = rawAlert;
    }
  }

  public initializeAlertType(
    getUiSettingsService: () => Promise<UiSettingsServiceStart>,
    monitoringCluster: ICustomClusterClient,
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

  public getAlertType() {
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
    };
  }

  public isEnabled() {
    return true;
  }

  public getId() {
    return this.rawAlert ? this.rawAlert.id : null;
  }

  public async createIfDoesNotExist(
    alertsClient: AlertsClient,
    actionsClient: ActionsClient,
    actionIds: string[]
  ): Promise<Alert> {
    const existingAlert = await alertsClient.find({
      options: {
        search: this.type,
      },
    });

    if (existingAlert.total === 1) {
      // TEMP CODE

      // return null;
      await alertsClient.delete(existingAlert.data[0]);
    }

    if (actionIds.length === 0) {
      let serverLogAction;
      const allActions = await actionsClient.getAll();
      for (const action of allActions) {
        if (action.name === DEFAULT_SERVER_LOG_NAME) {
          serverLogAction = action as ActionResult;
          break;
        }
      }
      if (!serverLogAction) {
        serverLogAction = await actionsClient.create({
          action: {
            name: DEFAULT_SERVER_LOG_NAME,
            actionTypeId: ALERT_ACTION_TYPE_LOG,
            config: {},
            secrets: {},
          },
        });
      }
      actionIds.push(serverLogAction.id);
    }

    const actions = actionIds.map(actionId => {
      return {
        group: 'default',
        id: actionId,
        params: this.getDefaultActionParams(ALERT_ACTION_TYPE_LOG),
      };
    });

    return await alertsClient.create({
      data: {
        enabled: true,
        name: this.label,
        alertTypeId: this.type,
        throttle: this.throttle,
        schedule: { interval: this.interval },
        actions,
      },
    });
  }

  public async updateOrAddAction(alertsClient: AlertsClient, action: AlertAction) {
    if (!this.rawAlert) {
      return null;
    }

    let actions = this.rawAlert.actions;
    const index = this.rawAlert.actions.findIndex(_action => _action.id === action.id);
    if (index === -1) {
      actions = [...this.rawAlert.actions, action];
    } else {
      actions = [
        ...this.rawAlert.actions.slice(0, index),
        action,
        ...this.rawAlert.actions.slice(index + 1),
      ];
    }

    this.rawAlert = (await alertsClient.update({
      id: this.rawAlert.id,
      data: {
        // TOOD: this will not scale, maybe an omit?
        ...pick(this.rawAlert, ALERTS_UPDATE_FIELDS),
        actions,
      },
    })) as Alert;
  }

  public async disableAction(alertsClient: AlertsClient, actionId: string) {
    if (!this.rawAlert) {
      return null;
    }

    const index = this.rawAlert.actions.findIndex(_action => _action.id === actionId);
    if (index === -1) {
      return null;
    }

    const actions = [
      ...this.rawAlert.actions.slice(0, index),
      ...this.rawAlert.actions.slice(index + 1),
    ];

    this.rawAlert = (await alertsClient.update({
      id: this.rawAlert.id,
      data: {
        // TOOD: this will not scale, maybe an omit?
        ...pick(this.rawAlert, ALERTS_UPDATE_FIELDS),
        actions,
      },
    })) as Alert;
  }

  protected async execute({ services, params, state }: AlertExecutorOptions): Promise<any> {
    const logger = this.getLogger(this.type);
    logger.debug(
      `Firing alert with params: ${JSON.stringify(params)} and state: ${JSON.stringify(state)}`
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
    const data = await this.fetchData(callCluster, clusters, uiSettings, availableCcs);

    for (const item of data) {
      const cluster = clusters.find((c: AlertCluster) => c.clusterUuid === item.clusterUuid);
      if (!cluster) {
        logger.warn(`Unable to find cluster for clusterUuid='${item.clusterUuid}'`);
        continue;
      }

      const instance = services.alertInstanceFactory(`${this.type}:${item.instanceKey}`);
      const alertState: AlertState = this.getDefaultAlertState(cluster, item);

      // custom shit

      let shouldExecuteActions = false;
      if (item.shouldFire) {
        logger.debug(`${this.type} is firing`);
        // alertState.cpuUsage = cpuUsage;
        alertState.ui.triggeredMS = +new Date();
        alertState.ui.isFiring = true;
        alertState.ui.message = this.getUiMessage(alertState, item);
        alertState.ui.severity = item.severity;
        alertState.ui.resolvedMS = 0;
        shouldExecuteActions = true;
      } else if (!item.shouldFire && alertState.ui.isFiring) {
        logger.debug(`${this.type} is not firing anymore`);
        // alertState.cpuUsage = cpuUsage;
        alertState.ui.isFiring = false;
        alertState.ui.resolvedMS = +new Date();
        alertState.ui.message = this.getUiMessage(alertState, item);
        shouldExecuteActions = true;
      }

      instance.replaceState(alertState);
      if (shouldExecuteActions) {
        this.executeActions(instance, alertState, item, cluster);
      }
    }
  }

  protected async fetchData(
    callCluster: any,
    clusters: AlertCluster[],
    uiSettings: IUiSettingsClient,
    availableCcs: string[]
  ): Promise<AlertData[]> {
    // Child should implement
    throw new Error('Child classes must implement `fetchData`');
  }

  public getDefaultActionParams(actionTypeId: string): any {
    switch (actionTypeId) {
      case ALERT_ACTION_TYPE_EMAIL:
        return {};
      case ALERT_ACTION_TYPE_LOG:
        return {
          message: null,
        };
    }
    return null;
  }

  protected getDefaultAlertState(cluster: AlertCluster, item: AlertData): AlertState {
    return {
      cluster,
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
    alertState: AlertState,
    item: AlertData,
    cluster: AlertCluster
  ) {
    throw new Error('Child classes must implement `executeActions`');
  }
}
