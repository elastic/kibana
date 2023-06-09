/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UseFormGetFieldState, UseFormGetValues, UseFormWatch } from 'react-hook-form';
import { CreateCompositeSLOForm } from '../helpers/process_form_values';

interface Props {
  getFieldState: UseFormGetFieldState<CreateCompositeSLOForm>;
  getValues: UseFormGetValues<CreateCompositeSLOForm>;
  watch: UseFormWatch<CreateCompositeSLOForm>;
}

export function useSectionFormValidation({ getFieldState, getValues, watch }: Props) {
  const sources = watch('sources');
  const firstSource = sources[0];

  const hasValidNumberOfSources = sources.length >= 2 && sources.length <= 30;
  const haveSameBudgetingMethod = sources.every(
    (source) =>
      !!source._data &&
      !!firstSource._data &&
      source._data.budgetingMethod === firstSource._data.budgetingMethod &&
      // timeslices window are undefined for occurrences, or should be the same time window for timeslices
      source._data.objective.timesliceWindow === firstSource._data.objective.timesliceWindow
  );
  const haveSameTimeWindow = sources.every(
    (source) =>
      !!source._data &&
      !!firstSource._data &&
      source._data.timeWindow.type === firstSource._data.timeWindow.type &&
      source._data.timeWindow.duration === firstSource._data.timeWindow.duration
  );

  const isSourcesSectionValid =
    hasValidNumberOfSources && haveSameBudgetingMethod && haveSameTimeWindow;

  const isObjectiveSectionValid = (['objective.target'] as const).every(
    (field) => getFieldState(field).error === undefined
  );

  const isDescriptionSectionValid = !getFieldState('name').invalid && getValues('name') !== '';

  return {
    isSourcesSectionValid,
    isObjectiveSectionValid,
    isDescriptionSectionValid,
  };
}
