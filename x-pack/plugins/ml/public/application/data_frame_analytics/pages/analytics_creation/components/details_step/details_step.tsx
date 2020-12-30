/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiForm } from '@elastic/eui';

import { CreateAnalyticsStepProps } from '../../../analytics_management/hooks/use_create_analytics_form';
import { DetailsStepDetails } from './details_step_details';
import { DetailsStepForm } from './details_step_form';
import { ANALYTICS_STEPS } from '../../page';

export const DetailsStep: FC<CreateAnalyticsStepProps> = ({
  actions,
  state,
  setCurrentStep,
  step,
  stepActivated,
}) => {
  const showForm = step === ANALYTICS_STEPS.DETAILS;
  const showDetails = step !== ANALYTICS_STEPS.DETAILS && stepActivated === true;

  const dataTestSubj = `mlAnalyticsCreateJobWizardDetailsStep${showForm ? ' active' : ''}${
    showDetails ? ' summary' : ''
  }`;

  return (
    <EuiForm className="mlDataFrameAnalyticsCreateForm" data-test-subj={dataTestSubj}>
      {showForm && (
        <DetailsStepForm actions={actions} state={state} setCurrentStep={setCurrentStep} />
      )}
      {showDetails && <DetailsStepDetails setCurrentStep={setCurrentStep} state={state} />}
    </EuiForm>
  );
};
