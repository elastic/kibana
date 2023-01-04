/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateSLOInput } from '@kbn/slo-schema';
import { FormState, UseFormGetFieldState } from 'react-hook-form';

interface Props {
  getFieldState: UseFormGetFieldState<CreateSLOInput>;
  formState: FormState<CreateSLOInput>;
}

export function useCheckFormPartialValidities({ getFieldState, formState }: Props) {
  const isDefinitionValid = (
    [
      'indicator.params.index',
      'indicator.params.filter',
      'indicator.params.good',
      'indicator.params.total',
    ] as const
  ).every((field) => getFieldState(field, formState).error === undefined);

  const isObjectiveValid = (
    [
      'budgetingMethod',
      'timeWindow.duration',
      'objective.target',
      'objective.timesliceTarget',
      'objective.timesliceWindow',
    ] as const
  ).every((field) => getFieldState(field, formState).error === undefined);

  const isDescriptionValid = (['name', 'description'] as const).every(
    (field) => getFieldState(field, formState).error === undefined
  );

  return { isDefinitionValid, isObjectiveValid, isDescriptionValid };
}
