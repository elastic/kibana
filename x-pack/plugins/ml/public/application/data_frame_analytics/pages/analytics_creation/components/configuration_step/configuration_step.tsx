/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiForm } from '@elastic/eui';

import { CreateAnalyticsFormProps } from '../../../analytics_management/hooks/use_create_analytics_form';
import { ConfigurationStepDetails } from './configuration_step_details';
import { ConfigurationStepForm } from './configuration_step_form';
import { ANALYTICS_STEPS } from '../../page';

export const ConfigurationStep: FC<CreateAnalyticsFormProps> = ({
  actions,
  state,
  setCurrentStep,
  step,
  stepActivated,
}) => {
  return (
    <EuiForm className="mlDataFrameAnalyticsCreateForm">
      {step === ANALYTICS_STEPS.CONFIGURATION && (
        <ConfigurationStepForm actions={actions} state={state} setCurrentStep={setCurrentStep} />
      )}
      {step !== ANALYTICS_STEPS.CONFIGURATION && stepActivated === true && (
        <ConfigurationStepDetails setCurrentStep={setCurrentStep} state={state} />
      )}
    </EuiForm>
  );
};
