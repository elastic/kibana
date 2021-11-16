/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { MetricsSourceConfigurationProperties } from '../../../../common/metrics_sources';
import { useIndicesConfigurationFormState } from './indices_configuration_form_state';

export const useSourceConfigurationFormState = (
  configuration?: MetricsSourceConfigurationProperties
) => {
  const indicesConfigurationFormState = useIndicesConfigurationFormState({
    initialFormState: useMemo(
      () =>
        configuration
          ? {
              name: configuration.name,
              description: configuration.description,
              metricAlias: configuration.metricAlias,
              anomalyThreshold: configuration.anomalyThreshold,
            }
          : undefined,
      [configuration]
    ),
  });

  const errors = useMemo(
    () => [...indicesConfigurationFormState.errors],
    [indicesConfigurationFormState.errors]
  );

  const resetForm = useCallback(() => {
    indicesConfigurationFormState.resetForm();
  }, [indicesConfigurationFormState]);

  const isFormDirty = useMemo(
    () => indicesConfigurationFormState.isFormDirty,
    [indicesConfigurationFormState.isFormDirty]
  );

  const isFormValid = useMemo(
    () => indicesConfigurationFormState.isFormValid,
    [indicesConfigurationFormState.isFormValid]
  );

  const formState = useMemo(
    () => ({
      name: indicesConfigurationFormState.formState.name,
      description: indicesConfigurationFormState.formState.description,
      metricAlias: indicesConfigurationFormState.formState.metricAlias,
      anomalyThreshold: indicesConfigurationFormState.formState.anomalyThreshold,
    }),
    [indicesConfigurationFormState.formState]
  );

  const formStateChanges = useMemo(
    () => ({
      name: indicesConfigurationFormState.formStateChanges.name,
      description: indicesConfigurationFormState.formStateChanges.description,
      metricAlias: indicesConfigurationFormState.formStateChanges.metricAlias,
      anomalyThreshold: indicesConfigurationFormState.formStateChanges.anomalyThreshold,
    }),
    [indicesConfigurationFormState.formStateChanges]
  );

  return {
    errors,
    formState,
    formStateChanges,
    isFormDirty,
    isFormValid,
    indicesConfigurationProps: indicesConfigurationFormState.fieldProps,
    resetForm,
  };
};
