/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import omit from 'lodash/omit';
import {
  CompositeSLOWithSummaryResponse,
  CreateCompositeSLOInput,
  SLOWithSummaryResponse,
  UpdateCompositeSLOInput,
} from '@kbn/slo-schema';
import { toDuration } from '../../../utils/slo/duration';

export type CreateCompositeSLOForm = Omit<CreateCompositeSLOInput, 'sources'> & {
  sources: Array<{ id: string; revision: number; weight: number; _data?: SLOWithSummaryResponse }>;
};

export function transformResponseToInput(
  values: CompositeSLOWithSummaryResponse | undefined
): CreateCompositeSLOForm | undefined {
  if (!values) return undefined;

  return {
    ...omit(values, ['id', 'createdAt', 'updatedAt', 'summary']),
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
  };
}

export function transformValuesToCreateInput(
  values: CreateCompositeSLOForm
): CreateCompositeSLOInput {
  return {
    ...values,
    // we remove the source._data used for the form validation
    sources: values.sources.map((source) => ({
      id: source.id,
      revision: source.revision,
      weight: source.weight,
    })),
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
  };
}

export function transformValuesToUpdateInput(
  values: CreateCompositeSLOForm
): UpdateCompositeSLOInput {
  return {
    ...values,
    // we remove the source._data used for the form validation
    sources: values.sources.map((source) => ({
      id: source.id,
      revision: source.revision,
      weight: source.weight,
    })),
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
  };
}
