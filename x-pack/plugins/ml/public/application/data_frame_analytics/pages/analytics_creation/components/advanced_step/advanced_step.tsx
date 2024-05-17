/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiForm } from '@elastic/eui';
import type { FC } from 'react';
import React from 'react';

import type { CreateAnalyticsStepProps } from '../../../analytics_management/hooks/use_create_analytics_form';
import { ANALYTICS_STEPS } from '../../page';
import { AdvancedStepDetails } from './advanced_step_details';
import { AdvancedStepForm } from './advanced_step_form';

export const AdvancedStep: FC<CreateAnalyticsStepProps> = ({
  actions,
  state,
  step,
  setCurrentStep,
  stepActivated,
}) => {
  const showForm = step === ANALYTICS_STEPS.ADVANCED;
  const showDetails = step !== ANALYTICS_STEPS.ADVANCED && stepActivated === true;

  const dataTestSubj = `mlAnalyticsCreateJobWizardAdvancedStep${showForm ? ' active' : ''}${
    showDetails ? ' summary' : ''
  }`;

  return (
    <EuiForm data-test-subj={dataTestSubj}>
      {showForm && (
        <AdvancedStepForm actions={actions} state={state} setCurrentStep={setCurrentStep} />
      )}
      {showDetails && <AdvancedStepDetails setCurrentStep={setCurrentStep} state={state} />}
    </EuiForm>
  );
};
