/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  ALERT_STATUS,
  ALERT_UUID,
  TIMESTAMP,
} from '@kbn/rule-data-utils/target/technical_field_names';
import { RuleDataClient } from '../../../../rule_registry/server';
import type { AlertStatus } from '../../../common/typings';
import { kqlQuery, rangeQuery } from '../../utils/queries';

export async function getTopAlerts({
  ruleDataClient,
  start,
  end,
  kuery,
  size,
  status,
}: {
  ruleDataClient: RuleDataClient;
  start: number;
  end: number;
  kuery?: string;
  size: number;
  status: AlertStatus;
}) {
  const response = await ruleDataClient.getReader().search({
    body: {
      query: {
        bool: {
          filter: [...rangeQuery(start, end), ...kqlQuery(kuery)],
        },
      },
      fields: ['*'],
      collapse: {
        field: ALERT_UUID,
      },
      size,
      sort: {
        [TIMESTAMP]: 'desc',
      },
      _source: false,
    },
    allow_no_indices: true,
  });

  // Since we're using `collapse` in the query, we'll get the most recent hit for each alert UUID sorted by timestamp.
  // This means that if an alert first had an "open" status and then later had a "closed" status we'll only get the
  // document for the "closed" status, which is what we want.
  //
  // We filter the returned results for open/closed/all here after we've gotten the response.
  return response.hits.hits
    .map((hit) => {
      return hit.fields;
    })
    .filter((fields) => {
      const requestedStatus = status;
      const responseStatus = (fields[ALERT_STATUS] ?? [undefined])[0];

      return requestedStatus === 'all' || requestedStatus === responseStatus;
    });
}
