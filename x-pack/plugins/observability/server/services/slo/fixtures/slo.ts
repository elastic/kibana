/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from '@kbn/core-saved-objects-server';
import {
  ALL_VALUE,
  CreateSLOParams,
  HistogramIndicator,
  sloSchema,
  TimesliceMetricIndicator,
} from '@kbn/slo-schema';
import { cloneDeep } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import {
  APMTransactionDurationIndicator,
  APMTransactionErrorRateIndicator,
  Duration,
  DurationUnit,
  Indicator,
  KQLCustomIndicator,
  MetricCustomIndicator,
  SLO,
  StoredSLO,
} from '../../../domain/models';
import { SO_SLO_TYPE } from '../../../saved_objects';
import { twoMinute } from './duration';
import { sevenDaysRolling, weeklyCalendarAligned } from './time_window';

export const createAPMTransactionErrorRateIndicator = (
  params: Partial<APMTransactionErrorRateIndicator['params']> = {}
): Indicator => ({
  type: 'sli.apm.transactionErrorRate',
  params: {
    environment: 'irrelevant',
    service: 'irrelevant',
    transactionName: 'irrelevant',
    transactionType: 'irrelevant',
    index: 'metrics-apm*',
    ...params,
  },
});

export const createAPMTransactionDurationIndicator = (
  params: Partial<APMTransactionDurationIndicator['params']> = {}
): Indicator => ({
  type: 'sli.apm.transactionDuration',
  params: {
    environment: 'irrelevant',
    service: 'irrelevant',
    transactionName: 'irrelevant',
    transactionType: 'irrelevant',
    threshold: 500,
    index: 'metrics-apm*',
    ...params,
  },
});

export const createKQLCustomIndicator = (
  params: Partial<KQLCustomIndicator['params']> = {}
): Indicator => ({
  type: 'sli.kql.custom',
  params: {
    index: 'my-index*,my-other-index*',
    filter: 'labels.groupId: group-3',
    good: 'latency < 300',
    total: '',
    timestampField: 'log_timestamp',
    ...params,
  },
});

export const createMetricCustomIndicator = (
  params: Partial<MetricCustomIndicator['params']> = {}
): MetricCustomIndicator => ({
  type: 'sli.metric.custom',
  params: {
    index: 'my-index*,my-other-index*',
    filter: 'labels.groupId: group-3',
    good: {
      metrics: [
        { name: 'A', aggregation: 'sum', field: 'total' },
        { name: 'B', aggregation: 'sum', field: 'processed' },
      ],
      equation: 'A - B',
    },
    total: {
      metrics: [{ name: 'A', aggregation: 'sum', field: 'total' }],
      equation: 'A',
    },
    timestampField: 'log_timestamp',
    ...params,
  },
});

export const createTimesliceMetricIndicator = (
  metrics: TimesliceMetricIndicator['params']['metric']['metrics'] = [],
  equation: TimesliceMetricIndicator['params']['metric']['equation'] = '',
  queryFilter = ''
): TimesliceMetricIndicator => ({
  type: 'sli.metric.timeslice',
  params: {
    index: 'test-*',
    timestampField: '@timestamp',
    filter: queryFilter,
    metric: {
      metrics,
      equation,
      threshold: 100,
      comparator: 'GTE',
    },
  },
});

export const createHistogramIndicator = (
  params: Partial<HistogramIndicator['params']> = {}
): HistogramIndicator => ({
  type: 'sli.histogram.custom',
  params: {
    index: 'my-index*,my-other-index*',
    filter: 'labels.groupId: group-3',
    good: {
      field: 'latency',
      aggregation: 'range',
      from: 0,
      to: 100,
      filter: '',
    },
    total: {
      field: 'latency',
      aggregation: 'value_count',
      filter: '',
    },
    timestampField: 'log_timestamp',
    ...params,
  },
});

const defaultSLO: Omit<SLO, 'id' | 'revision' | 'createdAt' | 'updatedAt'> = {
  name: 'irrelevant',
  description: 'irrelevant',
  timeWindow: sevenDaysRolling(),
  budgetingMethod: 'occurrences',
  objective: {
    target: 0.999,
  },
  indicator: createAPMTransactionDurationIndicator(),
  settings: {
    syncDelay: new Duration(1, DurationUnit.Minute),
    frequency: new Duration(1, DurationUnit.Minute),
  },
  tags: ['critical', 'k8s'],
  enabled: true,
  groupBy: ALL_VALUE,
};

const defaultCreateSloParams: CreateSLOParams = {
  name: 'irrelevant',
  description: 'irrelevant',
  timeWindow: sevenDaysRolling(),
  budgetingMethod: 'occurrences',
  objective: {
    target: 0.99,
  },
  indicator: createAPMTransactionDurationIndicator(),
};

export const createSLOParams = (params: Partial<CreateSLOParams> = {}): CreateSLOParams => ({
  ...defaultCreateSloParams,
  ...params,
});

export const aStoredSLO = (slo: SLO): SavedObject<StoredSLO> => {
  return {
    id: slo.id,
    attributes: sloSchema.encode(slo),
    type: SO_SLO_TYPE,
    references: [],
  };
};

export const createSLO = (params: Partial<SLO> = {}): SLO => {
  const now = new Date();
  return cloneDeep({
    ...defaultSLO,
    id: uuidv4(),
    revision: 1,
    createdAt: now,
    updatedAt: now,
    ...params,
  });
};

export const createSLOWithTimeslicesBudgetingMethod = (params: Partial<SLO> = {}): SLO => {
  return createSLO({
    budgetingMethod: 'timeslices',
    objective: {
      target: 0.98,
      timesliceTarget: 0.95,
      timesliceWindow: twoMinute(),
    },
    ...params,
  });
};

export const createSLOWithCalendarTimeWindow = (params: Partial<SLO> = {}): SLO => {
  return createSLO({
    timeWindow: weeklyCalendarAligned(),
    ...params,
  });
};
