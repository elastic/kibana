/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import {
  APMTransactionDurationIndicator,
  APMTransactionErrorRateIndicator,
  Indicator,
  SLO,
} from '../../../types/models';
import { CreateSLOParams } from '../../../types/rest_specs';

const defaultSLO: Omit<SLO, 'indicator' | 'id' | 'created_at' | 'updated_at'> = {
  name: 'irrelevant',
  description: 'irrelevant',
  time_window: {
    duration: '7d',
    is_rolling: true,
  },
  budgeting_method: 'occurrences',
  objective: {
    target: 0.999,
  },
  revision: 1,
};

export const createSLOParams = (indicator: Indicator): CreateSLOParams => ({
  ...defaultSLO,
  indicator,
});

export const createSLO = (indicator: Indicator): SLO => {
  const now = new Date();
  return {
    ...defaultSLO,
    id: uuid.v1(),
    indicator,
    revision: 1,
    created_at: now,
    updated_at: now,
  };
};

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
