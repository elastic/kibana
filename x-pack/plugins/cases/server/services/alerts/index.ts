/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';

import type { PublicMethodsOf } from '@kbn/utility-types';

import { Logger } from 'kibana/server';
import { CaseStatuses, MAX_ALERTS_PER_SUB_CASE } from '../../../common';
import { AlertInfo, createCaseError } from '../../common';
import { UpdateAlertRequest } from '../../client/alerts/types';
import { AlertsClient } from '../../../../rule_registry/server';
import { Alert } from './types';
import { STATUS_VALUES } from '../../../../rule_registry/common/technical_rule_data_field_names';

export type AlertServiceContract = PublicMethodsOf<AlertService>;

interface UpdateAlertsStatusArgs {
  alerts: UpdateAlertRequest[];
  logger: Logger;
}

interface GetAlertsArgs {
  alertsInfo: AlertInfo[];
  logger: Logger;
}

function isEmptyAlert(alert: AlertInfo): boolean {
  return isEmpty(alert.id) || isEmpty(alert.index);
}

export class AlertService {
  constructor(private readonly alertsClient?: PublicMethodsOf<AlertsClient>) {}

  public async updateAlertsStatus({ alerts, logger }: UpdateAlertsStatusArgs) {
    try {
      if (!this.alertsClient) {
        throw new Error(
          'Alert client is undefined, the rule registry plugin must be enabled to updated the status of alerts'
        );
      }

      const alertsToUpdate = alerts.filter((alert) => !isEmptyAlert(alert));

      if (alertsToUpdate.length <= 0) {
        return;
      }

      const updatedAlerts = await Promise.allSettled(
        alertsToUpdate.map((alert) =>
          this.alertsClient?.update({
            id: alert.id,
            index: alert.index,
            status: translateStatus({ alert, logger }),
            _version: undefined,
          })
        )
      );

      updatedAlerts.forEach((updatedAlert, index) => {
        if (updatedAlert.status === 'rejected') {
          logger.error(
            `Failed to update status for alert: ${JSON.stringify(alertsToUpdate[index])}: ${
              updatedAlert.reason
            }`
          );
        }
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to update alert status ids: ${JSON.stringify(alerts)}: ${error}`,
        error,
        logger,
      });
    }
  }

  public async getAlerts({ alertsInfo, logger }: GetAlertsArgs): Promise<Alert[] | undefined> {
    try {
      if (!this.alertsClient) {
        throw new Error(
          'Alert client is undefined, the rule registry plugin must be enabled to retrieve alerts'
        );
      }

      const alertsToGet = alertsInfo
        .filter((alert) => !isEmpty(alert))
        .slice(0, MAX_ALERTS_PER_SUB_CASE);

      if (alertsToGet.length <= 0) {
        return;
      }

      const retrievedAlerts = await Promise.allSettled(
        alertsToGet.map(({ id, index }) => this.alertsClient?.get({ id, index }))
      );

      retrievedAlerts.forEach((alert, index) => {
        if (alert.status === 'rejected') {
          logger.error(
            `Failed to retrieve alert: ${JSON.stringify(alertsToGet[index])}: ${alert.reason}`
          );
        }
      });

      return retrievedAlerts.map((alert, index) => {
        let source: unknown | undefined;
        let error: Error | undefined;

        if (alert.status === 'fulfilled') {
          source = alert.value;
        } else {
          error = alert.reason;
        }

        return {
          id: alertsToGet[index].id,
          index: alertsToGet[index].index,
          source,
          error,
        };
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to retrieve alerts ids: ${JSON.stringify(alertsInfo)}: ${error}`,
        error,
        logger,
      });
    }
  }
}

function translateStatus({
  alert,
  logger,
}: {
  alert: UpdateAlertRequest;
  logger: Logger;
}): STATUS_VALUES {
  const translatedStatuses: Record<string, STATUS_VALUES> = {
    [CaseStatuses.open]: 'open',
    [CaseStatuses['in-progress']]: 'acknowledged',
    [CaseStatuses.closed]: 'closed',
  };

  const translatedStatus = translatedStatuses[alert.status];
  if (!translatedStatus) {
    logger.error(
      `Unable to translate case status ${alert.status} during alert update: ${JSON.stringify(
        alert
      )}`
    );
  }
  return translatedStatus ?? 'open';
}
