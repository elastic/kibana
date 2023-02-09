/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateSLOInput } from '@kbn/slo-schema';
import { FormState, UseFormGetFieldState, UseFormWatch } from 'react-hook-form';

interface Props {
  getFieldState: UseFormGetFieldState<CreateSLOInput>;
  formState: FormState<CreateSLOInput>;
  watch: UseFormWatch<CreateSLOInput>;
}

export function useCheckFormPartialValidities({ getFieldState, formState, watch }: Props) {
  let isDefinitionValid: boolean;
  switch (watch('indicator.type')) {
    case 'sli.kql.custom':
      isDefinitionValid = (
        [
          'indicator.params.index',
          'indicator.params.filter',
          'indicator.params.good',
          'indicator.params.total',
        ] as const
      ).every((field) => !getFieldState(field, formState).invalid);
      break;
    case 'sli.apm.transactionDuration':
      isDefinitionValid = (
        [
          'indicator.params.service',
          'indicator.params.environment',
          'indicator.params.transactionType',
          'indicator.params.transactionName',
          'indicator.params.threshold.us',
          'indicator.params.index',
        ] as const
      ).every((field) => !getFieldState(field, formState).invalid);
      break;
    default:
      isDefinitionValid = false;
      break;
  }

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
