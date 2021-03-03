/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState } from 'react';
import { EuiForm } from '@elastic/eui';

import { CreateAnalyticsStepProps } from '../../../analytics_management/hooks/use_create_analytics_form';
import { ValidationStep } from './validation_step';
import { ValidationStepDetails } from './validation_step_details';
import { ANALYTICS_STEPS } from '../../page';

export interface ValidationSummary {
  warning: number;
  success: number;
}

export const ValidationStepWrapper: FC<CreateAnalyticsStepProps> = ({
  actions,
  state,
  setCurrentStep,
  step,
  stepActivated,
}) => {
  const [validationSummary, setValidationSummary] = useState<ValidationSummary>({
    warning: 0,
    success: 0,
  });

  const showValidationStep = step === ANALYTICS_STEPS.VALIDATION;
  const showDetails = step !== ANALYTICS_STEPS.VALIDATION && stepActivated === true;

  const dataTestSubj = `mlAnalyticsCreateJobWizardValidationStepWrapper${
    showValidationStep ? ' active' : ''
  }${showDetails ? ' summary' : ''}`;

  return (
    <EuiForm className="mlDataFrameAnalyticsCreateForm" data-test-subj={dataTestSubj}>
      {showValidationStep && (
        <ValidationStep
          actions={actions}
          state={state}
          setCurrentStep={setCurrentStep}
          setValidationSummary={setValidationSummary}
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
