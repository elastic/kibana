/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/types';
import { GetDefaultRuleAggregationParams } from '../../../../../../application/rule/methods/aggregate';

export const getDefaultRuleAggregation = (
  params?: GetDefaultRuleAggregationParams
): Record<string, AggregationsAggregationContainer> => {
  const { maxTags = 50 } = params || {};
  return {
    status: {
      terms: { field: 'alert.attributes.executionStatus.status' },
    },
    outcome: {
      terms: { field: 'alert.attributes.lastRun.outcome' },
    },
    enabled: {
      terms: { field: 'alert.attributes.enabled' },
    },
    muted: {
      terms: { field: 'alert.attributes.muteAll' },
    },
    tags: {
      terms: { field: 'alert.attributes.tags', order: { _key: 'asc' }, size: maxTags },
    },
    snoozed: {
      nested: {
        path: 'alert.attributes.snoozeSchedule',
      },
      aggs: {
        count: {
          filter: {
            exists: {
              field: 'alert.attributes.snoozeSchedule.duration',
            },
          },
        },
      },
    },
  };
};
