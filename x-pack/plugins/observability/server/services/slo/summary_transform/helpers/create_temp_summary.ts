/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_VALUE } from '@kbn/slo-schema';
import { SLO } from '../../../../domain/models';

export function createTempSummaryDocument(slo: SLO) {
  return {
    service: {
      environment: null,
      name: null,
    },
    transaction: {
      name: null,
      type: null,
    },
    slo: {
      indicator: {
        type: slo.indicator.type,
      },
      timeWindow: {
        duration: slo.timeWindow.duration.format(),
        type: slo.timeWindow.type,
      },
      groupBy: !!slo.groupBy ? slo.groupBy : ALL_VALUE,
      instanceId: ALL_VALUE,
      name: slo.name,
      description: slo.description,
      id: slo.id,
      budgetingMethod: slo.budgetingMethod,
      revision: slo.revision,
      tags: slo.tags,
    },
    goodEvents: 0,
    totalEvents: 0,
    errorBudgetEstimated: false,
    errorBudgetRemaining: 1,
    errorBudgetConsumed: 0,
    errorBudgetInitial: 1 - slo.objective.target,
    sliValue: -1,
    statusCode: 0,
    status: 'NO_DATA',
    isTempDoc: true,
  };
}
