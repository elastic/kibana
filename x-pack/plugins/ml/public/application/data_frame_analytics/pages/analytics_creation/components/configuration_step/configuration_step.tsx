/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { EuiForm } from '@elastic/eui';

import type { CreateAnalyticsStepProps } from '../../../analytics_management/hooks/use_create_analytics_form';
import { ConfigurationStepDetails } from './configuration_step_details';
import { ConfigurationStepForm } from './configuration_step_form';
import { ANALYTICS_STEPS } from '../../page';

export interface ConfigurationStepProps extends CreateAnalyticsStepProps {
  isClone: boolean;
  sourceDataViewTitle: string;
}

export const ConfigurationStep: FC<ConfigurationStepProps> = ({
  actions,
  state,
  setCurrentStep,
  step,
  stepActivated,
  isClone,
  sourceDataViewTitle,
}) => {
  const showForm = step === ANALYTICS_STEPS.CONFIGURATION;
  const showDetails = step !== ANALYTICS_STEPS.CONFIGURATION && stepActivated === true;

  const dataTestSubj = `mlAnalyticsCreateJobWizardConfigurationStep${showForm ? ' active' : ''}${
    showDetails ? ' summary' : ''
  }`;

  return (
    <EuiForm className="mlDataFrameAnalyticsCreateForm" data-test-subj={dataTestSubj}>
      {showForm && (
        <ConfigurationStepForm
          actions={actions}
          isClone={isClone}
          state={state}
          setCurrentStep={setCurrentStep}
          sourceDataViewTitle={sourceDataViewTitle}
        />
      )}
      {showDetails && <ConfigurationStepDetails setCurrentStep={setCurrentStep} state={state} />}
    </EuiForm>
  );
};
