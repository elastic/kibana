/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment-timezone';
import { i18n } from '@kbn/i18n';
import { Logger, ILegacyCustomClusterClient, UiSettingsServiceStart } from 'src/core/server';
import { ALERT_TYPE_CLUSTER_STATE } from '../../common/constants';
import { AlertType } from '../../../alerts/server';
import { executeActions, getUiMessage } from '../lib/alerts/cluster_state.lib';
import {
  AlertCommonExecutorOptions,
  AlertCommonState,
  AlertClusterStatePerClusterState,
  AlertCommonCluster,
} from './types';
import { AlertClusterStateState } from './enums';
import { getPreparedAlert } from '../lib/alerts/get_prepared_alert';
import { fetchClusterState } from '../lib/alerts/fetch_cluster_state';

export const getClusterState = (
  getUiSettingsService: () => Promise<UiSettingsServiceStart>,
  monitoringCluster: ILegacyCustomClusterClient,
  getLogger: (...scopes: string[]) => Logger,
  ccsEnabled: boolean
): AlertType => {
  const logger = getLogger(ALERT_TYPE_CLUSTER_STATE);
  return {
    id: ALERT_TYPE_CLUSTER_STATE,
    name: 'Monitoring Alert - Cluster Status',
    actionGroups: [
      {
        id: 'default',
        name: i18n.translate('xpack.monitoring.alerts.clusterState.actionGroups.default', {
          defaultMessage: 'Default',
        }),
      },
    ],
    producer: 'monitoring',
    defaultActionGroupId: 'default',
    async executor({
      services,
      params,
      state,
    }: AlertCommonExecutorOptions): Promise<AlertCommonState> {
      logger.debug(
        `Firing alert with params: ${JSON.stringify(params)} and state: ${JSON.stringify(state)}`
      );

      const preparedAlert = await getPreparedAlert(
        ALERT_TYPE_CLUSTER_STATE,
        getUiSettingsService,
        monitoringCluster,
        logger,
        ccsEnabled,
        services,
        fetchClusterState
      );

      if (!preparedAlert) {
        return state;
      }

      const { emailAddress, data: states, clusters } = preparedAlert;

      const result: AlertCommonState = { ...state };
      const defaultAlertState: AlertClusterStatePerClusterState = {
        state: AlertClusterStateState.Green,
        ui: {
          isFiring: false,
          message: null,
          severity: 0,
          resolvedMS: 0,
          triggeredMS: 0,
          lastCheckedMS: 0,
        },
      };

      for (const clusterState of states) {
        const alertState: AlertClusterStatePerClusterState =
          (state[clusterState.clusterUuid] as AlertClusterStatePerClusterState) ||
          defaultAlertState;
        const cluster = clusters.find(
          (c: AlertCommonCluster) => c.clusterUuid === clusterState.clusterUuid
        );
        if (!cluster) {
          logger.warn(`Unable to find cluster for clusterUuid='${clusterState.clusterUuid}'`);
          continue;
        }
        const isNonGreen = clusterState.state !== AlertClusterStateState.Green;
        const severity = clusterState.state === AlertClusterStateState.Red ? 2100 : 1100;

        const ui = alertState.ui;
        let triggered = ui.triggeredMS;
        let resolved = ui.resolvedMS;
        let message = ui.message || {};
        let lastState = alertState.state;
        const instance = services.alertInstanceFactory(ALERT_TYPE_CLUSTER_STATE);

        if (isNonGreen) {
          if (lastState === AlertClusterStateState.Green) {
            logger.debug(`Cluster state changed from green to ${clusterState.state}`);
            executeActions(instance, cluster, clusterState.state, emailAddress);
            lastState = clusterState.state;
            triggered = moment().valueOf();
          }
          message = getUiMessage(clusterState.state);
          resolved = 0;
        } else if (!isNonGreen && lastState !== AlertClusterStateState.Green) {
          logger.debug(`Cluster state changed from ${lastState} to green`);
          executeActions(instance, cluster, clusterState.state, emailAddress, true);
          lastState = clusterState.state;
          message = getUiMessage(clusterState.state, true);
          resolved = moment().valueOf();
        }

        result[clusterState.clusterUuid] = {
          state: lastState,
          ui: {
            message,
            isFiring: isNonGreen,
            severity,
            resolvedMS: resolved,
            triggeredMS: triggered,
            lastCheckedMS: moment().valueOf(),
          },
        } as AlertClusterStatePerClusterState;
      }

      return result;
    },
  };
};
