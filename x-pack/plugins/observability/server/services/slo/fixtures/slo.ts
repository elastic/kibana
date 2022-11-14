/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import uuid from 'uuid';

import {
  APMTransactionDurationIndicator,
  APMTransactionErrorRateIndicator,
  Indicator,
  KQLCustomIndicator,
  SLO,
} from '../../../domain/models';
import { CreateSLOParams } from '../../../types/rest_specs';
import { Paginated } from '../slo_repository';
import { sevenDays } from './duration';
import { sevenDaysRolling } from './time_window';

export const createAPMTransactionErrorRateIndicator = (
  params: Partial<APMTransactionErrorRateIndicator['params']> = {}
): Indicator => ({
  type: 'sli.apm.transaction_error_rate',
  params: {
    environment: 'irrelevant',
    service: 'irrelevant',
    transaction_name: 'irrelevant',
    transaction_type: 'irrelevant',
    good_status_codes: ['2xx', '3xx', '4xx'],
    ...params,
  },
});

export const createAPMTransactionDurationIndicator = (
  params: Partial<APMTransactionDurationIndicator['params']> = {}
): Indicator => ({
  type: 'sli.apm.transaction_duration',
  params: {
    environment: 'irrelevant',
    service: 'irrelevant',
    transaction_name: 'irrelevant',
    transaction_type: 'irrelevant',
    'threshold.us': 500000,
    ...params,
  },
});

export const createKQLCustomIndicator = (
  params: Partial<KQLCustomIndicator['params']> = {}
): Indicator => ({
  type: 'sli.kql.custom',
  params: {
    index: 'my-index*',
    query_filter: 'labels.groupId: group-3',
    numerator: 'latency < 300',
    denominator: '',
    ...params,
  },
});

const defaultSLO: Omit<SLO, 'id' | 'revision' | 'created_at' | 'updated_at'> = {
  name: 'irrelevant',
  description: 'irrelevant',
  time_window: sevenDaysRolling(),
  budgeting_method: 'occurrences',
  objective: {
    target: 0.999,
  },
  indicator: createAPMTransactionDurationIndicator(),
};

export const createSLOParams = (params: Partial<CreateSLOParams> = {}): CreateSLOParams => ({
  ...defaultSLO,
  ...params,
});

export const createSLO = (params: Partial<SLO> = {}): SLO => {
  const now = new Date();
  return cloneDeep({
    ...defaultSLO,
    id: uuid.v1(),
    revision: 1,
    created_at: now,
    updated_at: now,
    ...params,
  });
};

export const createSLOWithCalendarTimeWindow = (params: Partial<SLO> = {}): SLO => {
  return createSLO({
    time_window: {
      duration: sevenDays(),
      calendar: { start_time: new Date('2022-10-01T00:00:00.000Z') },
    },
    ...params,
  });
};

export const createPaginatedSLO = (
  slo: SLO,
  params: Partial<Paginated<SLO>> = {}
): Paginated<SLO> => {
  return {
    page: 1,
    perPage: 25,
    total: 1,
    results: [slo],
    ...params,
  };
};
