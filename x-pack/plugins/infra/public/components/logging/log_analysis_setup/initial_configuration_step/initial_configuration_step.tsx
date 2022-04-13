/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiForm, EuiSpacer } from '@elastic/eui';
import { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';
import { QualityWarning, SetupStatus } from '../../../../../common/log_analysis';
import { AnalysisSetupIndicesForm } from './analysis_setup_indices_form';
import { AnalysisSetupTimerangeForm } from './analysis_setup_timerange_form';
import {
  AvailableIndex,
  TimeRangeValidationError,
  timeRangeValidationErrorRT,
  ValidationIndicesError,
  validationIndicesErrorRT,
  ValidationUIError,
} from './validation';

interface InitialConfigurationStepProps {
  setStartTime: (startTime: number | undefined) => void;
  setEndTime: (endTime: number | undefined) => void;
  startTime: number | undefined;
  endTime: number | undefined;
  isValidating: boolean;
  validatedIndices: AvailableIndex[];
  setupStatus: SetupStatus;
  setValidatedIndices: (selectedIndices: AvailableIndex[]) => void;
  validationErrors?: ValidationUIError[];
  previousQualityWarnings?: QualityWarning[];
}

export const createInitialConfigurationStep = (
  props: InitialConfigurationStepProps
): EuiContainedStepProps => ({
  title: initialConfigurationStepTitle,
  children: <InitialConfigurationStep {...props} />,
});

export const InitialConfigurationStep: React.FunctionComponent<InitialConfigurationStepProps> = ({
  setStartTime,
  setEndTime,
  startTime,
  endTime,
  isValidating,
  validatedIndices,
  setupStatus,
  setValidatedIndices,
  validationErrors = [],
  previousQualityWarnings = [],
}: InitialConfigurationStepProps) => {
  const disabled = useMemo(() => !editableFormStatus.includes(setupStatus.type), [setupStatus]);

  const [indexValidationErrors, timeRangeValidationErrors, globalValidationErrors] = useMemo(
    () => partitionValidationErrors(validationErrors),
    [validationErrors]
  );

  return (
    <>
      <EuiForm>
        <AnalysisSetupTimerangeForm
          disabled={disabled}
          setStartTime={setStartTime}
          setEndTime={setEndTime}
          startTime={startTime}
          endTime={endTime}
          validationErrors={timeRangeValidationErrors}
        />
        <EuiSpacer size="xl" />
        <AnalysisSetupIndicesForm
          disabled={disabled}
          indices={validatedIndices}
          isValidating={isValidating}
          onChangeSelectedIndices={setValidatedIndices}
          previousQualityWarnings={previousQualityWarnings}
          validationErrors={indexValidationErrors}
        />

        <ValidationErrors errors={globalValidationErrors} />
      </EuiForm>
    </>
  );
};

const editableFormStatus = ['required', 'failed', 'skipped'];

const errorCalloutTitle = i18n.translate(
  'xpack.infra.analysisSetup.steps.initialConfigurationStep.errorCalloutTitle',
  {
    defaultMessage: 'Your index configuration is not valid',
  }
);

const initialConfigurationStepTitle = i18n.translate(
  'xpack.infra.analysisSetup.configurationStepTitle',
  {
    defaultMessage: 'Configuration',
  }
);

const ValidationErrors: React.FC<{ errors: ValidationUIError[] }> = ({ errors }) => {
  if (errors.length === 0) {
    return null;
  }

  return (
    <>
      <EuiCallOut color="danger" iconType="alert" title={errorCalloutTitle}>
        <ul>
          {errors.map((error, i) => (
            <li key={i}>{formatValidationError(error)}</li>
          ))}
        </ul>
      </EuiCallOut>
      <EuiSpacer />
    </>
  );
};

const formatValidationError = (error: ValidationUIError): React.ReactNode => {
  switch (error.error) {
    case 'NETWORK_ERROR':
      return (
        <FormattedMessage
          id="xpack.infra.analysisSetup.indicesSelectionNetworkError"
          defaultMessage="We couldn't load your index configuration"
        />
      );

    case 'TOO_FEW_SELECTED_INDICES':
      return (
        <FormattedMessage
          id="xpack.infra.analysisSetup.indicesSelectionTooFewSelectedIndicesDescription"
          defaultMessage="Select at least one index name."
        />
      );

    default:
      return '';
  }
};

const partitionValidationErrors = (validationErrors: ValidationUIError[]) =>
  validationErrors.reduce<
    [ValidationIndicesError[], TimeRangeValidationError[], ValidationUIError[]]
  >(
    ([indicesErrors, timeRangeErrors, otherErrors], error) => {
      if (validationIndicesErrorRT.is(error)) {
        return [[...indicesErrors, error], timeRangeErrors, otherErrors];
      } else if (timeRangeValidationErrorRT.is(error)) {
        return [indicesErrors, [...timeRangeErrors, error], otherErrors];
      } else {
        return [indicesErrors, timeRangeErrors, [...otherErrors, error]];
      }
    },
    [[], [], []]
  );
