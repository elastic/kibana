/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { omit } from 'lodash';
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

  return response.events.map((event) => {
    return {
      '@timestamp': event['@timestamp'],
      active: event['event.action'] !== 'close',
      severityLevel: event['kibana.rac.alert.severity.level'],
      duration: event['kibana.rac.alert.duration.us']!,
      start: event['kibana.rac.alert.start']!,
      producer: event['kibana.rac.producer']!,
      id: event['kibana.rac.alert.id']!,
      uuid: event['kibana.rac.alert.uuid']!,
      ruleCategory: event['rule.category']!,
      ruleId: event['rule.id']!,
      ruleName: event['rule.name']!,
      ruleUuid: event['rule.uuid']!,
      fields: omit(
        event,
        '@timestamp',
        'event.action',
        'event.kind',
        ...(Object.keys(event).filter((key) => key.startsWith('kibana')) as never[]),
        ...(Object.keys(event).filter((key) => key.startsWith('rule')) as never[])
      ),
    };
  });
}
