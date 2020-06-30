/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment-timezone';
import { Logger, ILegacyCustomClusterClient, UiSettingsServiceStart } from 'src/core/server';
import { i18n } from '@kbn/i18n';
import { ALERT_TYPE_LICENSE_EXPIRATION } from '../../common/constants';
import { AlertType } from '../../../alerts/server';
import { fetchLicenses } from '../lib/alerts/fetch_licenses';
import {
  AlertCommonState,
  AlertLicensePerClusterState,
  AlertCommonExecutorOptions,
  AlertCommonCluster,
  AlertLicensePerClusterUiState,
} from './types';
import { executeActions, getUiMessage } from '../lib/alerts/license_expiration.lib';
import { getPreparedAlert } from '../lib/alerts/get_prepared_alert';

const EXPIRES_DAYS = [60, 30, 14, 7];

export const getLicenseExpiration = (
  getUiSettingsService: () => Promise<UiSettingsServiceStart>,
  monitoringCluster: ILegacyCustomClusterClient,
  getLogger: (...scopes: string[]) => Logger,
  ccsEnabled: boolean
): AlertType => {
  const logger = getLogger(ALERT_TYPE_LICENSE_EXPIRATION);
  return {
    id: ALERT_TYPE_LICENSE_EXPIRATION,
    name: 'Monitoring Alert - License Expiration',
    actionGroups: [
      {
        id: 'default',
        name: i18n.translate('xpack.monitoring.alerts.licenseExpiration.actionGroups.default', {
          defaultMessage: 'Default',
        }),
      },
    ],
    defaultActionGroupId: 'default',
    producer: 'monitoring',
    async executor({ services, params, state }: AlertCommonExecutorOptions): Promise<any> {
      logger.debug(
        `Firing alert with params: ${JSON.stringify(params)} and state: ${JSON.stringify(state)}`
      );

      const preparedAlert = await getPreparedAlert(
        ALERT_TYPE_LICENSE_EXPIRATION,
        getUiSettingsService,
        monitoringCluster,
        logger,
        ccsEnabled,
        services,
        fetchLicenses
      );

      if (!preparedAlert) {
        return state;
      }

      const { emailAddress, data: licenses, clusters, dateFormat } = preparedAlert;

      const result: AlertCommonState = { ...state };
      const defaultAlertState: AlertLicensePerClusterState = {
        expiredCheckDateMS: 0,
        ui: {
          isFiring: false,
          message: null,
          severity: 0,
          resolvedMS: 0,
          lastCheckedMS: 0,
          triggeredMS: 0,
        },
      };

      for (const license of licenses) {
        const alertState: AlertLicensePerClusterState =
          (state[license.clusterUuid] as AlertLicensePerClusterState) || defaultAlertState;
        const cluster = clusters.find(
          (c: AlertCommonCluster) => c.clusterUuid === license.clusterUuid
        );
        if (!cluster) {
          logger.warn(`Unable to find cluster for clusterUuid='${license.clusterUuid}'`);
          continue;
        }
        const $expiry = moment.utc(license.expiryDateMS);
        let isExpired = false;
        let severity = 0;

        if (license.status !== 'active') {
          isExpired = true;
          severity = 2001;
        } else if (license.expiryDateMS) {
          for (let i = EXPIRES_DAYS.length - 1; i >= 0; i--) {
            if (license.type === 'trial' && i < 2) {
              break;
            }

            const $fromNow = moment.utc().add(EXPIRES_DAYS[i], 'days');
            if ($fromNow.isAfter($expiry)) {
              isExpired = true;
              severity = 1000 * i;
              break;
            }
          }
        }

        const ui = alertState.ui;
        let triggered = ui.triggeredMS;
        let resolved = ui.resolvedMS;
        let message = ui.message;
        let expiredCheckDate = alertState.expiredCheckDateMS;
        const instance = services.alertInstanceFactory(ALERT_TYPE_LICENSE_EXPIRATION);

        if (isExpired) {
          if (!alertState.expiredCheckDateMS) {
            logger.debug(`License will expire soon, sending email`);
            executeActions(instance, cluster, $expiry, dateFormat, emailAddress);
            expiredCheckDate = triggered = moment().valueOf();
          }
          message = getUiMessage();
          resolved = 0;
        } else if (!isExpired && alertState.expiredCheckDateMS) {
          logger.debug(`License expiration has been resolved, sending email`);
          executeActions(instance, cluster, $expiry, dateFormat, emailAddress, true);
          expiredCheckDate = 0;
          message = getUiMessage(true);
          resolved = moment().valueOf();
        }

        result[license.clusterUuid] = {
          expiredCheckDateMS: expiredCheckDate,
          ui: {
            message,
            expirationTime: license.expiryDateMS,
            isFiring: expiredCheckDate > 0,
            severity,
            resolvedMS: resolved,
            triggeredMS: triggered,
            lastCheckedMS: moment().valueOf(),
          } as AlertLicensePerClusterUiState,
        } as AlertLicensePerClusterState;
      }

      return result;
    },
  };
};
