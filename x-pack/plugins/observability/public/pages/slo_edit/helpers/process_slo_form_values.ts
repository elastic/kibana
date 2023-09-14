/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateSLOInput, SLOWithSummaryResponse, UpdateSLOInput } from '@kbn/slo-schema';
import { toDuration } from '../../../utils/slo/duration';
import { CreateSLOForm } from '../types';

export function transformSloResponseToCreateSloForm(
  values: SLOWithSummaryResponse | undefined
): CreateSLOForm | undefined {
  if (!values) return undefined;

  return {
    name: values.name,
    description: values.description,
    indicator: values.indicator,
    budgetingMethod: values.budgetingMethod,
    timeWindow: {
      duration: values.timeWindow.duration,
      type: values.timeWindow.type,
    },
    objective: {
      target: values.objective.target * 100,
      ...(values.budgetingMethod === 'timeslices' &&
        values.objective.timesliceTarget && {
          timesliceTarget: values.objective.timesliceTarget * 100,
        }),
      ...(values.budgetingMethod === 'timeslices' &&
        values.objective.timesliceWindow && {
          timesliceWindow: String(toDuration(values.objective.timesliceWindow).value),
        }),
    },
    groupBy: values.groupBy,
    tags: values.tags,
  };
}

export function transformCreateSLOFormToCreateSLOInput(values: CreateSLOForm): CreateSLOInput {
  return {
    name: values.name,
    description: values.description,
    indicator: values.indicator,
    budgetingMethod: values.budgetingMethod,
    timeWindow: {
      duration: values.timeWindow.duration,
      type: values.timeWindow.type,
    },
    objective: {
      target: values.objective.target / 100,
      ...(values.budgetingMethod === 'timeslices' &&
        values.objective.timesliceTarget && {
          timesliceTarget: values.objective.timesliceTarget / 100,
        }),
      ...(values.budgetingMethod === 'timeslices' &&
        values.objective.timesliceWindow && {
          timesliceWindow: `${values.objective.timesliceWindow}m`,
        }),
    },
    tags: values.tags,
    groupBy: values.groupBy,
  };
}

export function transformValuesToUpdateSLOInput(values: CreateSLOForm): UpdateSLOInput {
  return {
    name: values.name,
    description: values.description,
    indicator: values.indicator,
    budgetingMethod: values.budgetingMethod,
    timeWindow: {
      duration: values.timeWindow.duration,
      type: values.timeWindow.type,
    },
    objective: {
      target: values.objective.target / 100,
      ...(values.budgetingMethod === 'timeslices' &&
        values.objective.timesliceTarget && {
          timesliceTarget: values.objective.timesliceTarget / 100,
        }),
      ...(values.budgetingMethod === 'timeslices' &&
        values.objective.timesliceWindow && {
          timesliceWindow: `${values.objective.timesliceWindow}m`,
        }),
    },
    tags: values.tags,
    groupBy: values.groupBy,
  };
}

export function transformPartialCreateSLOInputToPartialCreateSLOForm(
  values: Partial<CreateSLOInput>
): Partial<CreateSLOForm> {
  return {
    ...values,
    ...(values.objective && {
      objective: {
        target: values.objective.target * 100,
        ...(values.objective.timesliceTarget && {
          timesliceTarget: values.objective.timesliceTarget * 100,
        }),
        ...(values.objective.timesliceWindow && {
          timesliceWindow: String(toDuration(values.objective.timesliceWindow).value),
        }),
      },
    }),
  };
}
