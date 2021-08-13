/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';

import type { PublicMethodsOf } from '@kbn/utility-types';

import { Logger } from 'kibana/server';
import { MAX_ALERTS_PER_SUB_CASE } from '../../../common';
import { AlertInfo, createCaseError } from '../../common';
import { UpdateAlertRequest } from '../../client/alerts/types';
import { AlertsClient } from '../../../../rule_registry/server';
import { Alert } from './types';

export type AlertServiceContract = PublicMethodsOf<AlertService>;

interface UpdateAlertsStatusArgs {
  alerts: UpdateAlertRequest[];
  alertsClient: PublicMethodsOf<AlertsClient>;
  logger: Logger;
}

interface GetAlertsArgs {
  alertsInfo: AlertInfo[];
  alertsClient: PublicMethodsOf<AlertsClient>;
  logger: Logger;
}

function isEmptyAlert(alert: AlertInfo): boolean {
  return isEmpty(alert.id) || isEmpty(alert.index);
}

export class AlertService {
  constructor() {}

  public async updateAlertsStatus({ alerts, alertsClient, logger }: UpdateAlertsStatusArgs) {
    try {
      const alertsToUpdate = alerts.filter((alert) => !isEmptyAlert(alert));

      if (alertsToUpdate.length <= 0) {
        return;
      }

      return await Promise.all(
        alertsToUpdate.map((alert) =>
          alertsClient.update({
            id: alert.id,
            index: alert.index,
            _version: undefined,
            status: alert.status,
          })
        )
      );
    } catch (error) {
      throw createCaseError({
        message: `Failed to update alert status ids: ${JSON.stringify(alerts)}: ${error}`,
        error,
        logger,
      });
    }
  }

  public async getAlerts({
    alertsClient,
    alertsInfo,
    logger,
  }: GetAlertsArgs): Promise<Alert[] | undefined> {
    try {
      const alertsToGet = alertsInfo
        .filter((alert) => !isEmpty(alert))
        .slice(0, MAX_ALERTS_PER_SUB_CASE);

      if (alertsToGet.length <= 0) {
        return;
      }

      const retrievedAlertsSource = await Promise.all(
        alertsToGet.map((alert) => alertsClient.get({ id: alert.id, index: alert.index }))
      );

      return retrievedAlertsSource.map((alert, index) => ({
        id: alertsToGet[index].id,
        index: alertsToGet[index].index,
        source: alert,
      }));
    } catch (error) {
      throw createCaseError({
        message: `Failed to retrieve alerts ids: ${JSON.stringify(alertsInfo)}: ${error}`,
        error,
        logger,
      });
    }
  }
}
