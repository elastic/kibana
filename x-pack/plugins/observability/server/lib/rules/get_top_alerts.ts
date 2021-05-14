/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ALERT_UUID, TIMESTAMP } from '@kbn/rule-data-utils/target/technical_field_names';
import { RuleDataClient } from '../../../../rule_registry/server';
import { kqlQuery, rangeQuery } from '../../utils/queries';

export async function getTopAlerts({
  ruleDataClient,
  start,
  end,
  kuery,
  size,
}: {
  ruleDataClient: RuleDataClient;
  start: number;
  end: number;
  kuery?: string;
  size: number;
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

  return response.hits.hits.map((hit) => {
    return hit.fields;
  });
}
