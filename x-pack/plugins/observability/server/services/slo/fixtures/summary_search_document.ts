/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_VALUE } from '@kbn/slo-schema';
import { v4 as uuidv4 } from 'uuid';

export const aSummaryDocument = ({
  id = uuidv4(),
  sliValue = 0.9,
  consumed = 0.4,
  isTempDoc = false,
  status = 'HEALTHY',
} = {}) => {
  return {
    goodEvents: 96,
    totalEvents: 100,
    errorBudgetEstimated: false,
    errorBudgetRemaining: 1 - consumed,
    errorBudgetConsumed: consumed,
    isTempDoc,
    service: {
      environment: null,
      name: null,
    },
    slo: {
      indicator: {
        type: 'sli.kql.custom',
      },
      timeWindow: {
        duration: '30d',
        type: 'rolling',
      },
      instanceId: ALL_VALUE,
      name: 'irrelevant',
      description: '',
      id,
      budgetingMethod: 'occurrences',
      revision: 1,
      tags: ['tag-one', 'tag-two', 'irrelevant'],
    },
    errorBudgetInitial: 0.02,
    transaction: {
      name: null,
      type: null,
    },
    sliValue,
    statusCode: 4,
    status,
  };
};

export const aHitFromSummaryIndex = (_source: any) => {
  return {
    _index: '.slo-observability.summary-v2',
    _id: uuidv4(),
    _score: 1,
    _source,
  };
};

export const aHitFromTempSummaryIndex = (_source: any) => {
  return {
    _index: '.slo-observability.summary-v2.temp',
    _id: uuidv4(),
    _score: 1,
    _source,
  };
};
