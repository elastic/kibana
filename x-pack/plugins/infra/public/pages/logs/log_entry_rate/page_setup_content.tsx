/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer, EuiSteps, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useMemo } from 'react';

import { BetaBadge } from '../../../components/beta_badge';
import {
  createInitialConfigurationStep,
  createProcessStep,
  LogAnalysisSetupPage,
  LogAnalysisSetupPageContent,
  LogAnalysisSetupPageHeader,
} from '../../../components/logging/log_analysis_setup';
import { useTrackPageview } from '../../../../../observability/public';
import { useLogEntryRateSetup } from './use_log_entry_rate_setup';

export const LogEntryRateSetupContent: React.FunctionComponent = () => {
  useTrackPageview({ app: 'infra_logs', path: 'log_entry_rate_setup' });
  useTrackPageview({ app: 'infra_logs', path: 'log_entry_rate_setup', delay: 15000 });

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
        viewResults,
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
      viewResults,
    ]
  );

  return (
    <LogAnalysisSetupPage data-test-subj="logEntryRateSetupPage">
      <LogAnalysisSetupPageHeader>
        <FormattedMessage
          id="xpack.infra.analysisSetup.analysisSetupTitle"
          defaultMessage="Enable Machine Learning analysis"
        />{' '}
        <BetaBadge />
      </LogAnalysisSetupPageHeader>
      <LogAnalysisSetupPageContent>
        <EuiText size="s">
          <FormattedMessage
            id="xpack.infra.analysisSetup.analysisSetupDescription"
            defaultMessage="Use Machine Learning to automatically detect anomalous log rate counts."
          />
        </EuiText>
        <EuiSpacer />
        <EuiSteps steps={steps} />
      </LogAnalysisSetupPageContent>
    </LogAnalysisSetupPage>
  );
};
