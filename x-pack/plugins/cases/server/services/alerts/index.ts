/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import { isEmpty } from 'lodash';

import type { PublicMethodsOf } from '@kbn/utility-types';

import { Logger } from 'kibana/server';
import { MAX_ALERTS_PER_SUB_CASE, MAX_CONCURRENT_SEARCHES } from '../../../common';
import { AlertInfo, createCaseError } from '../../common';
import { UpdateAlertRequest } from '../../client/alerts/types';
import { AlertsClient } from '../../../../rule_registry/server';
import { Alert } from './types';

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

      return await pMap(
        alertsToUpdate,
        async (alert: UpdateAlertRequest) =>
          this.alertsClient?.update({
            id: alert.id,
            index: alert.index,
            _version: undefined,
            status: alert.status,
          }),
        {
          concurrency: MAX_CONCURRENT_SEARCHES,
        }
      );
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

      const retrievedAlertsSource = await pMap(
        alertsToGet,
        async (alert: AlertInfo) => this.alertsClient?.get({ id: alert.id, index: alert.index }),
        {
          concurrency: MAX_CONCURRENT_SEARCHES,
        }
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
