/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate';
import { useAnalysisSetupState } from '../../log_analysis_setup_state';
import { useLogEntryRateModuleContext } from './use_log_entry_rate_module';

export const useLogEntryRateSetup = () => {
  const {
    cleanUpAndSetUpModule,
    lastSetupErrorMessages,
    moduleDescriptor,
    setUpModule,
    setupStatus,
    sourceConfiguration,
    viewResults,
  } = useLogEntryRateModuleContext();

  const {
    cleanUpAndSetUp,
    endTime,
    isValidating,
    setEndTime,
    setStartTime,
    setValidatedIndices,
    setUp,
    startTime,
    validatedIndices,
    validationErrors,
  } = useAnalysisSetupState({
    cleanUpAndSetUpModule,
    moduleDescriptor,
    setUpModule,
    sourceConfiguration,
  });

  return {
    cleanUpAndSetUp,
    endTime,
    isValidating,
    lastSetupErrorMessages,
    moduleDescriptor,
    setEndTime,
    setStartTime,
    setValidatedIndices,
    setUp,
    setupStatus,
    startTime,
    validatedIndices,
    validationErrors,
    viewResults,
  };
};

export const [LogEntryRateSetupProvider, useLogEntryRateSetupContext] = createContainer(
  useLogEntryRateSetup
);
