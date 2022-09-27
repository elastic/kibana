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
} from '../../../domain/models';
import { CreateSLOParams } from '../../../types/rest_specs';

export const createAPMTransactionErrorRateIndicator = (
  params: Partial<APMTransactionErrorRateIndicator['params']> = {}
): APMTransactionErrorRateIndicator => ({
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
): APMTransactionDurationIndicator => ({
  type: 'slo.apm.transaction_duration',
  params: {
    environment: 'irrelevant',
    service: 'irrelevant',
    transaction_name: 'irrelevant',
    transaction_type: 'irrelevant',
    threshold: 500000,
    ...params,
  },
});

const defaultSLO = {
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
  indicator: createAPMTransactionErrorRateIndicator(),
};

export const createSLOParams = (indicator: Indicator): CreateSLOParams => ({
  ...defaultSLO,
  indicator,
});

export const createSLO = (params: Partial<SLO> = {}): SLO => {
  const now = new Date();
  return new SLO(
    params.id ?? uuid.v1(),
    params.name ?? defaultSLO.name,
    params.description ?? defaultSLO.description,
    params.indicator ?? defaultSLO.indicator,
    params.time_window ?? defaultSLO.time_window,
    params.budgeting_method ?? defaultSLO.budgeting_method,
    params.objective ?? defaultSLO.objective,
    now,
    now
  );
};
