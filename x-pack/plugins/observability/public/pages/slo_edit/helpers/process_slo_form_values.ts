/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateSLOParams, GetSLOResponse } from '@kbn/slo-schema';

export function transformGetSloToCreateSloParams(
  values: GetSLOResponse | undefined
): CreateSLOParams | undefined {
  if (!values) return undefined;

  return {
    ...values,
    objective: {
      target: values.objective.target * 100,
      ...(values.objective.timesliceTarget && {
        timesliceTarget: values.objective.timesliceTarget * 100,
      }),
    },
  } as unknown as CreateSLOParams;
}

export function processValues(values: CreateSLOParams): CreateSLOParams {
  return {
    ...values,
    objective: {
      target: values.objective.target / 100,
      ...(values.objective.timesliceTarget && {
        timesliceTarget: values.objective.timesliceTarget / 100,
      }),
    },
  };
}
