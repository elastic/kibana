/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SLO } from '../../typings';
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
      sliValue: Number(result.summary.sliValue),
      errorBudget: {
        remaining: Number(result.summary.errorBudget.remaining),
      },
    },
  };
}
