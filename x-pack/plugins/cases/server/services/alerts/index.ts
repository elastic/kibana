/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';

import type { PublicMethodsOf } from '@kbn/utility-types';

import { ElasticsearchClient, Logger } from 'kibana/server';
import { MAX_ALERTS_PER_SUB_CASE } from '../../../common';
import { UpdateAlertRequest } from '../../client/types';
import { AlertInfo } from '../../common';
import { createCaseError } from '../../common/error';

export type AlertServiceContract = PublicMethodsOf<AlertService>;

interface UpdateAlertsStatusArgs {
  alerts: UpdateAlertRequest[];
  scopedClusterClient: ElasticsearchClient;
  logger: Logger;
}

interface GetAlertsArgs {
  alertsInfo: AlertInfo[];
  scopedClusterClient: ElasticsearchClient;
  logger: Logger;
}

interface Alert {
  _id: string;
  _index: string;
  _source: Record<string, unknown>;
}

interface AlertsResponse {
  docs: Alert[];
}

function isEmptyAlert(alert: AlertInfo): boolean {
  return isEmpty(alert.id) || isEmpty(alert.index);
}

export class AlertService {
  constructor() {}

  public async updateAlertsStatus({ alerts, scopedClusterClient, logger }: UpdateAlertsStatusArgs) {
    try {
      const body = alerts
        .filter((alert) => !isEmptyAlert(alert))
        .flatMap((alert) => [
          { update: { _id: alert.id, _index: alert.index } },
          { doc: { signal: { status: alert.status } } },
        ]);

      if (body.length <= 0) {
        return;
      }

      return scopedClusterClient.bulk({ body });
    } catch (error) {
      throw createCaseError({
        message: `Failed to update alert status ids: ${JSON.stringify(alerts)}: ${error}`,
        error,
        logger,
      });
    }
  }

  public async getAlerts({
    scopedClusterClient,
    alertsInfo,
    logger,
  }: GetAlertsArgs): Promise<AlertsResponse | undefined> {
    try {
      const docs = alertsInfo
        .filter((alert) => !isEmptyAlert(alert))
        .slice(0, MAX_ALERTS_PER_SUB_CASE)
        .map((alert) => ({ _id: alert.id, _index: alert.index }));

      if (docs.length <= 0) {
        return;
      }

      const results = await scopedClusterClient.mget<Alert>({ body: { docs } });

      // @ts-expect-error @elastic/elasticsearch _source is optional
      return results.body;
    } catch (error) {
      throw createCaseError({
        message: `Failed to retrieve alerts ids: ${JSON.stringify(alertsInfo)}: ${error}`,
        error,
        logger,
      });
    }
  }
}
