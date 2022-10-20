/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import uuid from 'uuid';
import { Duration, DurationUnit } from '../../../types/models/duration';

import {
  APMTransactionDurationIndicator,
  APMTransactionErrorRateIndicator,
  Indicator,
  SLO,
} from '../../../types/models';
import { CreateSLOParams } from '../../../types/rest_specs';

export const createAPMTransactionErrorRateIndicator = (
  params: Partial<APMTransactionErrorRateIndicator['params']> = {}
): Indicator => ({
  type: 'slo.apm.transaction_error_rate',
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
  type: 'slo.apm.transaction_duration',
  params: {
    environment: 'irrelevant',
    service: 'irrelevant',
    transaction_name: 'irrelevant',
    transaction_type: 'irrelevant',
    'threshold.us': 500000,
    ...params,
  },
});

const defaultSLO: Omit<SLO, 'id' | 'revision' | 'created_at' | 'updated_at'> = {
  name: 'irrelevant',
  description: 'irrelevant',
  time_window: {
    duration: new Duration(7, DurationUnit.d),
    is_rolling: true,
  },
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
      duration: new Duration(7, DurationUnit.d),
      calendar: { start_time: new Date('2022-10-01T00:00:00.000Z') },
    },
    ...params,
  });
};
