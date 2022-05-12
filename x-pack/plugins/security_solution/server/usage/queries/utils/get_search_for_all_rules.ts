/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import type { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { RULE_EXECUTION_LOG_PROVIDER } from '../../../lib/detection_engine/rule_execution_log/event_log/constants';

/**
 * Given an aggregation of "aggs" this will return a search for all rules within 24 hours.
 * @param eventLogIndex The event log index such as ".kibana-event-log-8.2.0*"
 * @param aggs The aggregation to break things down by
 */
export const getSearchForAllRules = ({
  eventLogIndex,
  aggs,
}: {
  eventLogIndex: string;
  aggs: Record<string, AggregationsAggregationContainer>;
}): SearchRequest => ({
  index: eventLogIndex,
  size: 0,
  track_total_hits: false,
  aggs,
  query: {
    bool: {
      filter: {
        bool: {
          must: [
            {
              range: {
                '@timestamp': {
                  gte: 'now-24h',
                  lte: 'now',
                },
              },
            },
            {
              term: {
                'event.provider': RULE_EXECUTION_LOG_PROVIDER,
              },
            },
          ],
        },
      },
    },
  },
});
