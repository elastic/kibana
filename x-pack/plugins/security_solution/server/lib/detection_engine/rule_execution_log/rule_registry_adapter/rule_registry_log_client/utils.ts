/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchSort } from '@elastic/elasticsearch/api/types';
import { EVENT_ACTION, TIMESTAMP } from '@kbn/rule-data-utils';
import { RuleExecutionStatus } from '../../../../../../common/detection_engine/schemas/common/schemas';
import { ExecutionMetric } from '../../types';
import { RULE_STATUS, EVENT_SEQUENCE, EVENT_DURATION, EVENT_END } from './constants';

const METRIC_FIELDS = {
  [ExecutionMetric.executionGap]: EVENT_DURATION,
  [ExecutionMetric.searchDurationMax]: EVENT_DURATION,
  [ExecutionMetric.indexingDurationMax]: EVENT_DURATION,
  [ExecutionMetric.indexingLookback]: EVENT_END,
};

/**
 * Returns ECS field in which metric value is stored
 * @deprecated getMetricField is kept here only as a reference. It will be superseded with EventLog implementation
 *
 * @param metric - execution metric
 * @returns ECS field
 */
export const getMetricField = <T extends ExecutionMetric>(metric: T) => METRIC_FIELDS[metric];

/**
 * @deprecated sortByTimeDesc is kept here only as a reference. It will be superseded with EventLog implementation
 */
export const sortByTimeDesc: SearchSort = [{ [TIMESTAMP]: 'desc' }, { [EVENT_SEQUENCE]: 'desc' }];

/**
 * Builds aggregation to retrieve the most recent metric value
 * @deprecated getMetricAggregation is kept here only as a reference. It will be superseded with EventLog implementation
 *
 * @param metric - execution metric
 * @returns aggregation
 */
export const getMetricAggregation = (metric: ExecutionMetric) => ({
  filter: {
    term: { [EVENT_ACTION]: metric },
  },
  aggs: {
    event: {
      top_hits: {
        size: 1,
        sort: sortByTimeDesc,
        _source: [TIMESTAMP, getMetricField(metric)],
      },
    },
  },
});

/**
 * Builds aggregation to retrieve the most recent log entry with the given status
 * @deprecated getLastEntryAggregation is kept here only as a reference. It will be superseded with EventLog implementation
 *
 * @param status - rule execution status
 * @returns aggregation
 */
export const getLastEntryAggregation = (status: RuleExecutionStatus) => ({
  filter: {
    term: { [RULE_STATUS]: status },
  },
  aggs: {
    event: {
      top_hits: {
        sort: sortByTimeDesc,
        size: 1,
      },
    },
  },
});
