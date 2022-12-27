/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SLO, Status } from '../../typings';
import { STATUS } from '../../typings';

import { toDuration } from './duration';

export function toSLO(result: any): SLO {
  const duration = toDuration(result.timeWindow.duration);

  return {
    id: String(result.id),
    name: String(result.name),
    objective: { target: Number(result.objective.target) },
    timeWindow: {
      duration,
    },
    summary: {
      status: toStatus(result),
      sliValue: Number(result.summary.sliValue),
      errorBudget: {
        remaining: Number(result.summary.errorBudget.remaining),
        isEstimated: result.summary.errorBudget.isEstimated,
      },
    },
  };
}

function toStatus(result: any): Status {
  if (result.summary.sli_value === -1) {
    return STATUS.NoData;
  }

  if (result.objective.target <= result.summary.sli_value) {
    return STATUS.Healthy;
  } else {
    return result.summary.error_budget.remaining > 0 ? STATUS.Degrading : STATUS.Violated;
  }
}
