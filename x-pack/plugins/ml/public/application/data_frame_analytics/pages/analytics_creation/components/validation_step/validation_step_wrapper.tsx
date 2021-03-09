/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useState } from 'react';
import { EuiForm } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { CreateAnalyticsStepProps } from '../../../analytics_management/hooks/use_create_analytics_form';
import { ValidationStep } from './validation_step';
import { ValidationStepDetails } from './validation_step_details';
import { ANALYTICS_STEPS } from '../../page';
import { useMlApiContext } from '../../../../../contexts/kibana';
import { DataFrameAnalyticsConfig } from '../../../../../../../common/types/data_frame_analytics';
import { getJobConfigFromFormState } from '../../../analytics_management/hooks/use_create_analytics_form/state';
import { extractErrorMessage } from '../../../../../../../common/util/errors';
import {
  CalloutMessage,
  ValidateAnalyticsJobResponse,
  VALIDATION_STATUS,
} from '../../../../../../../common/constants/validation';

export interface ValidationSummary {
  warning: number;
  success: number;
}

export const ValidationStepWrapper: FC<CreateAnalyticsStepProps> = ({
  state,
  setCurrentStep,
  step,
  stepActivated,
}) => {
  const [validationSummary, setValidationSummary] = useState<ValidationSummary>({
    warning: 0,
    success: 0,
  });
  const [checksInProgress, setChecksInProgress] = useState<boolean>(false);
  const [validationMessages, setValidationMessages] = useState<CalloutMessage[]>([]);
  const [errorMessage, setErrorMessage] = useState<CalloutMessage | undefined>();
  const { form, jobConfig, isAdvancedEditorEnabled } = state;
  const { jobType, trainingPercent, numTopFeatureImportanceValues, numTopClasses, includes } = form;
  const showValidationStep = step === ANALYTICS_STEPS.VALIDATION;
  const showDetails = step !== ANALYTICS_STEPS.VALIDATION && stepActivated === true;
  const {
    dataFrameAnalytics: { validateDataFrameAnalytics },
  } = useMlApiContext();

  const dataTestSubj = `mlAnalyticsCreateJobWizardValidationStepWrapper${
    showValidationStep ? ' active' : ''
  }${showDetails ? ' summary' : ''}`;

  const runValidationChecks = async () => {
    try {
      const analyticsJobConfig = (isAdvancedEditorEnabled
        ? jobConfig
        : getJobConfigFromFormState(form)) as DataFrameAnalyticsConfig;
      const validationResults: ValidateAnalyticsJobResponse = await validateDataFrameAnalytics(
        analyticsJobConfig
      );

      const valSummary = { warning: 0, success: 0 };
      validationResults.forEach((message) => {
        if (message?.status === VALIDATION_STATUS.WARNING) {
          valSummary.warning++;
        } else if (message?.status === VALIDATION_STATUS.SUCCESS) {
          valSummary.success++;
        }
      });

      setValidationMessages(validationResults);
      setValidationSummary(valSummary);
      setChecksInProgress(false);
    } catch (err) {
      setErrorMessage({
        heading: i18n.translate(
          'xpack.ml.dataframe.analytics.validation.validationFetchErrorMessage',
          {
            defaultMessage: 'Error validating job',
          }
        ),
        id: 'error',
        status: VALIDATION_STATUS.ERROR,
        text: extractErrorMessage(err),
      });
      setChecksInProgress(false);
    }
  };

  useEffect(
    function beginValidationChecks() {
      if (jobType !== undefined && (showValidationStep || stepActivated === true)) {
        setChecksInProgress(true);
        runValidationChecks();
      }
    },
    [showValidationStep, trainingPercent, numTopFeatureImportanceValues, numTopClasses, includes]
  );

  if (errorMessage !== undefined) {
    validationMessages.push(errorMessage);
  }

  return (
    <EuiForm className="mlDataFrameAnalyticsCreateForm" data-test-subj={dataTestSubj}>
      {showValidationStep && (
        <ValidationStep
          checksInProgress={checksInProgress}
          validationMessages={validationMessages}
          setCurrentStep={setCurrentStep}
        />
      )}
      {showDetails && (
        <ValidationStepDetails
          setCurrentStep={setCurrentStep}
          state={state}
          validationSummary={validationSummary}
        />
      )}
    </EuiForm>
  );
};
