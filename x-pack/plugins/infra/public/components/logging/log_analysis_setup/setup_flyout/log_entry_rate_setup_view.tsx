/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useCallback } from 'react';
import { EuiTitle, EuiText, EuiSpacer, EuiSteps } from '@elastic/eui';
import { createInitialConfigurationStep } from '../initial_configuration_step';
import { createProcessStep } from '../process_step';
import { useLogEntryRateSetup } from '../../../../containers/logs/log_analysis/modules/log_entry_rate';

export const LogEntryRateSetupView: React.FC<{
  onClose: () => void;
}> = ({ onClose }) => {
  const {
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
  } = useLogEntryRateSetup();

  const viewResultsAndClose = useCallback(() => {
    viewResults();
    onClose();
  }, [viewResults, onClose]);

  const steps = useMemo(
    () => [
      createInitialConfigurationStep({
        setStartTime,
        setEndTime,
        startTime,
        endTime,
        isValidating,
        validatedIndices,
        setupStatus,
        setValidatedIndices,
        validationErrors,
      }),
      createProcessStep({
        cleanUpAndSetUp,
        errorMessages: lastSetupErrorMessages,
        isConfigurationValid: validationErrors.length <= 0 && !isValidating,
        setUp,
        setupStatus,
        viewResults: viewResultsAndClose,
      }),
    ],
    [
      cleanUpAndSetUp,
      endTime,
      isValidating,
      lastSetupErrorMessages,
      setEndTime,
      setStartTime,
      setUp,
      setValidatedIndices,
      setupStatus,
      startTime,
      validatedIndices,
      validationErrors,
      viewResultsAndClose,
    ]
  );

  return (
    <>
      <EuiTitle size="s">
        <h3>{moduleDescriptor.moduleName} </h3>
      </EuiTitle>
      <EuiText size="s">{moduleDescriptor.moduleDescription}</EuiText>
      <EuiSpacer />
      <EuiSteps steps={steps} />
    </>
  );
};
