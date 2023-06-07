/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateCompositeSLOInput } from '@kbn/slo-schema';
import { UseFormGetFieldState, UseFormGetValues } from 'react-hook-form';

interface Props {
  getFieldState: UseFormGetFieldState<CreateCompositeSLOInput>;
  getValues: UseFormGetValues<CreateCompositeSLOInput>;
}

export function useSectionFormValidation({ getFieldState, getValues }: Props) {
  const isSourceSectionValid: boolean = true;

  const isObjectiveSectionValid = (
    [
      'budgetingMethod',
      'timeWindow.duration',
      'objective.target',
      'objective.timesliceTarget',
      'objective.timesliceWindow',
    ] as const
  ).every((field) => getFieldState(field).error === undefined);

  const isDescriptionSectionValid = !getFieldState('name').invalid && getValues('name') !== '';

  return {
    isSourceSectionValid,
    isObjectiveSectionValid,
    isDescriptionSectionValid,
  };
}
