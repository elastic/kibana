/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormState, UseFormGetFieldState } from 'react-hook-form';
import type { CreateSLOParams } from '../../../../server/types/rest_specs';

interface UseCheckFormPartialValiditiesProps {
  getFieldState: UseFormGetFieldState<CreateSLOParams>;
  formState: FormState<CreateSLOParams>;
}

export function useCheckFormPartialValidities({
  getFieldState,
  formState,
}: UseCheckFormPartialValiditiesProps) {
  const isDefinitionValid = (
    [
      'indicator.params.index',
      'indicator.params.filter',
      'indicator.params.good',
      'indicator.params.total',
    ] as const
  ).every((field) => getFieldState(field, formState).error === undefined);

  const isObjectiveValid = (
    ['budgeting_method', 'time_window.duration', 'objective.target'] as const
  ).every((field) => getFieldState(field, formState).error === undefined);

  const isDescriptionValid = (['name'] as const).every(
    (field) => getFieldState(field, formState).error === undefined
  );

  return { isDefinitionValid, isObjectiveValid, isDescriptionValid };
}
