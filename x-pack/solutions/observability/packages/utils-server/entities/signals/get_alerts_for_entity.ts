/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { RulesClient } from '@kbn/alerting-plugin/server';
import { AlertsClient } from '@kbn/rule-registry-plugin/server';
import {
  ALERT_GROUP_FIELD,
  ALERT_GROUP_VALUE,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_TIME_RANGE,
} from '@kbn/rule-data-utils';
import { kqlQuery } from '../../es/queries/kql_query';
import { rangeQuery } from '../../es/queries/range_query';

export async function getAlertsForEntity({
  start,
  end,
  entity,
  alertsClient,
  rulesClient,
  size,
}: {
  start: number;
  end: number;
  entity: Record<string, unknown>;
  alertsClient: AlertsClient;
  rulesClient: RulesClient;
  size: number;
}) {
  const alertsKuery = Object.entries(entity)
    .map(([field, value]) => {
      return `(${[
        `(${ALERT_GROUP_FIELD}:"${field}" AND ${ALERT_GROUP_VALUE}:"${value}")`,
        `(${field}:"${value}")`,
      ].join(' OR ')})`;
    })
    .join(' AND ');

  const openAlerts = await alertsClient.find({
    size,
    query: {
      bool: {
        filter: [
          ...kqlQuery(alertsKuery),
          ...rangeQuery(start, end, ALERT_TIME_RANGE),
          { term: { [ALERT_STATUS]: ALERT_STATUS_ACTIVE } },
        ],
      },
    },
  });

  return openAlerts;
}
