/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useEffect, useMemo, useState } from 'react';
import { debounce } from 'lodash';

import { EuiForm } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { extractErrorMessage } from '@kbn/ml-error-utils';

import type { CreateAnalyticsStepProps } from '../../../analytics_management/hooks/use_create_analytics_form';
import { ValidationStep } from './validation_step';
import { ValidationStepDetails } from './validation_step_details';
import { ANALYTICS_STEPS } from '../../page';
import { useMlApi } from '../../../../../contexts/kibana';
import { getJobConfigFromFormState } from '../../../analytics_management/hooks/use_create_analytics_form/state';
import type {
  CalloutMessage,
  ValidateAnalyticsJobResponse,
} from '../../../../../../../common/constants/validation';
import { VALIDATION_STATUS } from '../../../../../../../common/constants/validation';

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
  const [checksInProgress, setChecksInProgress] = useState<boolean>(false);
  const [validationMessages, setValidationMessages] = useState<CalloutMessage[]>([]);
  const [errorMessage, setErrorMessage] = useState<CalloutMessage | undefined>();
  const { form, jobConfig, isAdvancedEditorEnabled } = state;
  const {
    dependentVariable,
    jobType,
    trainingPercent,
    numTopFeatureImportanceValues,
    numTopClasses,
    includes,
  } = form;
  const showValidationStep = step === ANALYTICS_STEPS.VALIDATION;
  const showDetails = step !== ANALYTICS_STEPS.VALIDATION && stepActivated === true;
  const {
    dataFrameAnalytics: { validateDataFrameAnalytics },
  } = useMlApi();

  const dataTestSubj = `mlAnalyticsCreateJobWizardValidationStepWrapper${
    showValidationStep ? ' active' : ''
  }${showDetails ? ' summary' : ''}`;

  const debouncedValidationChecks = debounce(async () => {
    setChecksInProgress(true);
    try {
      const analyticsJobConfig = isAdvancedEditorEnabled
        ? jobConfig
        : getJobConfigFromFormState(form);
      const validationResults: ValidateAnalyticsJobResponse = await validateDataFrameAnalytics(
        analyticsJobConfig
      );

      setValidationMessages(validationResults);
      setErrorMessage(undefined);
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
  }, 500);

  useEffect(
    function beginValidationChecks() {
      if (jobType !== undefined && (showValidationStep || stepActivated === true)) {
        debouncedValidationChecks();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      showValidationStep,
      dependentVariable,
      trainingPercent,
      numTopFeatureImportanceValues,
      numTopClasses,
      includes,
    ]
  );

  if (errorMessage !== undefined) {
    validationMessages.push(errorMessage);
  }

  const validationSummary = useMemo(
    () =>
      validationMessages.reduce(
        (acc, message) => {
          if (message?.status === VALIDATION_STATUS.WARNING) {
            acc.warning += 1;
          } else if (message?.status === VALIDATION_STATUS.SUCCESS) {
            acc.success += 1;
          }
          return acc;
        },
        { warning: 0, success: 0 }
      ),
    [validationMessages]
  );

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
