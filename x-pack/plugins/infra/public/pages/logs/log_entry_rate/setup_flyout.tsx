/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiSteps,
} from '@elastic/eui';

import {
  createInitialConfigurationStep,
  createProcessStep,
} from '../../../components/logging/log_analysis_setup';
import { useLogEntryRateSetup } from './use_log_entry_rate_setup';

interface LogEntryRateSetupFlyoutProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LogEntryRateSetupFlyout: React.FC<LogEntryRateSetupFlyoutProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    cleanUpAndSetUp,
    endTime,
    isValidating,
    lastSetupErrorMessages,
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

  if (!isOpen) {
    return null;
  }
  return (
    <EuiFlyout onClose={onClose}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.infra.logs.setupFlyout.setupFlyoutTitle"
              defaultMessage="Anomaly detection with Machine Learning"
            />
          </h3>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.infra.logs.setupFlyout.logRateTitle"
              defaultMessage="Log rate"
            />
          </h3>
        </EuiTitle>
        <EuiText size="s">
          <FormattedMessage
            id="xpack.infra.logs.setupFlyout.logRateDescription"
            defaultMessage="Use Machine Learning to automatically detect anomalous log rate counts."
          />
        </EuiText>
        <EuiSpacer />
        <EuiSteps steps={steps} />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
