/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiSteps,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useCallback, useMemo } from 'react';
import {
  createInitialConfigurationStep,
  createProcessStep,
} from '../../../components/logging/log_analysis_setup';
import { useLogEntryCategoriesSetup } from '../../../containers/logs/log_analysis/modules/log_entry_categories';

interface LogEntryCategoriesSetupFlyoutProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LogEntryCategoriesSetupFlyout: React.FC<LogEntryCategoriesSetupFlyoutProps> = ({
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
  } = useLogEntryCategoriesSetup();

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
              id="xpack.infra.logs.setupFlyout.logCategoriesTitle"
              defaultMessage="Log categories"
            />
          </h3>
        </EuiTitle>
        <EuiText size="s">
          <FormattedMessage
            id="xpack.infra.logs.setupFlyout.logCategoriesDescription"
            defaultMessage="Use Machine Learning to automatically categorize log messages."
          />
        </EuiText>
        <EuiSpacer />
        <EuiSteps steps={steps} />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
