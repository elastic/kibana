/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import { isEmpty } from 'lodash';

import type { PublicMethodsOf } from '@kbn/utility-types';

import { ElasticsearchClient, Logger } from 'kibana/server';
import { CaseStatuses } from '../../../common/api';
import { MAX_ALERTS_PER_SUB_CASE, MAX_CONCURRENT_SEARCHES } from '../../../common/constants';
import { createCaseError } from '../../common/error';
import { AlertInfo } from '../../common/types';
import { UpdateAlertRequest } from '../../client/alerts/types';
import {
  ALERT_WORKFLOW_STATUS,
  STATUS_VALUES,
} from '../../../../rule_registry/common/technical_rule_data_field_names';

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
      const bucketedAlerts = bucketAlertsByIndexAndStatus(alerts, logger);
      const indexBuckets = Array.from(bucketedAlerts.entries());

      await pMap(
        indexBuckets,
        async (indexBucket: [string, Map<STATUS_VALUES, TranslatedUpdateAlertRequest[]>]) =>
          updateByQuery(indexBucket, scopedClusterClient),
        { concurrency: MAX_CONCURRENT_SEARCHES }
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

interface TranslatedUpdateAlertRequest {
  id: string;
  index: string;
  status: STATUS_VALUES;
}

function bucketAlertsByIndexAndStatus(
  alerts: UpdateAlertRequest[],
  logger: Logger
): Map<string, Map<STATUS_VALUES, TranslatedUpdateAlertRequest[]>> {
  return alerts.reduce<Map<string, Map<STATUS_VALUES, TranslatedUpdateAlertRequest[]>>>(
    (acc, alert) => {
      // skip any alerts that are empty
      if (isEmptyAlert(alert)) {
        return acc;
      }

      const translatedAlert = { ...alert, status: translateStatus({ alert, logger }) };
      const statusToAlertId = acc.get(translatedAlert.index);

      // if we haven't seen the index before
      if (!statusToAlertId) {
        // add a new index in the parent map, with an entry for the status the alert set to pointing
        // to an initial array of only the current alert
        acc.set(translatedAlert.index, createStatusToAlertMap(translatedAlert));
      } else {
        // We had the index in the map so check to see if we have a bucket for the
        // status, if not add a new status entry with the alert, if so update the status entry
        // with the alert
        updateIndexEntryWithStatus(statusToAlertId, translatedAlert);
      }

      return acc;
    },
    new Map()
  );
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

function createStatusToAlertMap(
  alert: TranslatedUpdateAlertRequest
): Map<STATUS_VALUES, TranslatedUpdateAlertRequest[]> {
  return new Map<STATUS_VALUES, TranslatedUpdateAlertRequest[]>([[alert.status, [alert]]]);
}

function updateIndexEntryWithStatus(
  statusToAlerts: Map<STATUS_VALUES, TranslatedUpdateAlertRequest[]>,
  alert: TranslatedUpdateAlertRequest
) {
  const statusBucket = statusToAlerts.get(alert.status);

  if (!statusBucket) {
    statusToAlerts.set(alert.status, [alert]);
  } else {
    statusBucket.push(alert);
  }
}

async function updateByQuery(
  [index, statusToAlertMap]: [string, Map<STATUS_VALUES, TranslatedUpdateAlertRequest[]>],
  scopedClusterClient: ElasticsearchClient
) {
  const statusBuckets = Array.from(statusToAlertMap);
  return Promise.all(
    // this will create three update by query calls one for each of the three statuses
    statusBuckets.map(([status, translatedAlerts]) =>
      scopedClusterClient.updateByQuery({
        index,
        conflicts: 'abort',
        body: {
          script: {
            source: `if (ctx._source['${ALERT_WORKFLOW_STATUS}'] != null) {
              ctx._source['${ALERT_WORKFLOW_STATUS}'] = '${status}'
            }
            if (ctx._source.signal != null && ctx._source.signal.status != null) {
              ctx._source.signal.status = '${status}'
            }`,
            lang: 'painless',
          },
          // the query here will contain all the ids that have the same status for the same index
          // being updated
          query: { ids: { values: translatedAlerts.map(({ id }) => id) } },
        },
        ignore_unavailable: true,
      })
    )
  );
}
