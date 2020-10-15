/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiCallOut,
  EuiCode,
} from '@elastic/eui';
import { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';

import { SetupStatus } from '../../../../../common/log_analysis';
import { CreateMLJobsButton } from './create_ml_jobs_button';
import { RecreateMLJobsButton } from './recreate_ml_jobs_button';

interface ProcessStepProps {
  cleanUpAndSetUp: () => void;
  errorMessages: string[];
  isConfigurationValid: boolean;
  setUp: () => void;
  setupStatus: SetupStatus;
  viewResults: () => void;
}

export const createProcessStep = (props: ProcessStepProps): EuiContainedStepProps => ({
  title: processStepTitle,
  children: <ProcessStep {...props} />,
  status:
    props.setupStatus.type === 'pending'
      ? 'incomplete'
      : props.setupStatus.type === 'failed'
      ? 'danger'
      : props.setupStatus.type === 'succeeded'
      ? 'complete'
      : undefined,
});

export const ProcessStep: React.FunctionComponent<ProcessStepProps> = ({
  cleanUpAndSetUp,
  errorMessages,
  isConfigurationValid,
  setUp,
  setupStatus,
  viewResults,
}) => {
  return (
    <EuiText size="s">
      {setupStatus.type === 'pending' ? (
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xl" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <FormattedMessage
              id="xpack.infra.analysisSetup.steps.setupProcess.loadingText"
              defaultMessage="Creating ML job..."
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : setupStatus.type === 'failed' ? (
        <>
          <FormattedMessage
            id="xpack.infra.analysisSetup.steps.setupProcess.failureText"
            defaultMessage="Something went wrong creating the necessary ML jobs. Please ensure all selected log indices exist."
          />
          <EuiSpacer />
          {errorMessages.map((errorMessage, i) => (
            <EuiCallOut key={i} color="danger" iconType="alert" title={errorCalloutTitle}>
              <EuiCode transparentBackground>{errorMessage}</EuiCode>
            </EuiCallOut>
          ))}
          <EuiSpacer />
          <EuiButton fill onClick={cleanUpAndSetUp}>
            <FormattedMessage
              id="xpack.infra.analysisSetup.steps.setupProcess.tryAgainButton"
              defaultMessage="Try again"
            />
          </EuiButton>
        </>
      ) : setupStatus.type === 'succeeded' ? (
        <>
          <FormattedMessage
            id="xpack.infra.analysisSetup.steps.setupProcess.successText"
            defaultMessage="The ML jobs have been set up successfully"
          />
          <EuiSpacer />
          <EuiButton fill onClick={viewResults}>
            <FormattedMessage
              id="xpack.infra.analysisSetup.steps.setupProcess.viewResultsButton"
              defaultMessage="View results"
            />
          </EuiButton>
        </>
      ) : setupStatus.type === 'required' ? (
        <CreateMLJobsButton isDisabled={!isConfigurationValid} onClick={setUp} />
      ) : (
        <RecreateMLJobsButton isDisabled={!isConfigurationValid} onClick={cleanUpAndSetUp} />
      )}
    </EuiText>
  );
};

const errorCalloutTitle = i18n.translate(
  'xpack.infra.analysisSetup.steps.setupProcess.errorCalloutTitle',
  {
    defaultMessage: 'An error occurred',
  }
);

const processStepTitle = i18n.translate('xpack.infra.analysisSetup.actionStepTitle', {
  defaultMessage: 'Create ML job',
});
