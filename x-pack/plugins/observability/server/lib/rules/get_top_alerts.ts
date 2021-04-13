/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ObservabilityRuleRegistryClient } from '../../types';
import { kqlQuery, rangeQuery } from '../../utils/queries';

export async function getTopAlerts({
  ruleRegistryClient,
  start,
  end,
  kuery,
  size,
}: {
  ruleRegistryClient: ObservabilityRuleRegistryClient;
  start: number;
  end: number;
  kuery?: string;
  size: number;
}) {
  const response = await ruleRegistryClient.search({
    body: {
      query: {
        bool: {
          filter: [...rangeQuery(start, end), ...kqlQuery(kuery)],
        },
      },
      fields: ['*'],
      collapse: {
        field: 'kibana.rac.alert.uuid',
      },
      size,
      sort: {
        '@timestamp': 'desc',
      },
      _source: false,
    },
  });

  return response.events;
}
