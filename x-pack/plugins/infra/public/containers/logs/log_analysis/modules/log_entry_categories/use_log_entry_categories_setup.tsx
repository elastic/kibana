/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useAnalysisSetupState } from '../../log_analysis_setup_state';
import { useLogEntryCategoriesModuleContext } from './use_log_entry_categories_module';
import { useLogEntryCategoriesQuality } from './use_log_entry_categories_quality';

export const useLogEntryCategoriesSetup = () => {
  const {
    cleanUpAndSetUpModule,
    fetchJobStatus,
    jobSummaries,
    lastSetupErrorMessages,
    moduleDescriptor,
    setUpModule,
    setupStatus,
    sourceConfiguration,
    viewResults,
  } = useLogEntryCategoriesModuleContext();

  const { categoryQualityWarnings } = useLogEntryCategoriesQuality({ jobSummaries });

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
    categoryQualityWarnings,
    cleanUpAndSetUp,
    endTime,
    fetchJobStatus,
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
