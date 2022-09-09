/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import { SLI, SLO } from '../../../types/models';

export const createSLO = (indicator: SLI): SLO => ({
  id: uuid.v1(),
  name: 'irrelevant',
  description: 'irrelevant',
  indicator,
  time_window: {
    duration: '7d',
    is_rolling: true,
  },
  budgeting_method: 'occurrences',
  objective: {
    target: 0.999,
  },
  settings: {
    destination_index: 'some-index',
  },
});

export const createAPMTransactionErrorRateIndicator = (params = {}): SLI => ({
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

export const createAPMTransactionDurationIndicator = (params = {}): SLI => ({
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
