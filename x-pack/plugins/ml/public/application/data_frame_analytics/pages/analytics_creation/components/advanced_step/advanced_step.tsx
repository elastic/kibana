/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment } from 'react';
import { EuiButton, EuiForm, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { CreateAnalyticsFormProps } from '../../../analytics_management/hooks/use_create_analytics_form';
import { ANALYTICS_STEP_NUMBERS } from '../../page';
import { ContinueButton } from '../continue_button';
import { AdvancedStepForm } from './advanced_step_form';
import { AdvancedStepDetails } from './advanced_step_details';

export const AdvancedStep: FC<CreateAnalyticsFormProps> = ({
  actions,
  state,
  step,
  setCurrentStep,
}) => {
  return (
    <EuiForm>
      {step === ANALYTICS_STEP_NUMBERS.advanced && (
        <Fragment>
          <AdvancedStepForm actions={actions} state={state} />
          <EuiSpacer />
          <ContinueButton
            onClick={() => {
              setCurrentStep(ANALYTICS_STEP_NUMBERS.details);
            }}
          />
        </Fragment>
      )}
      {step !== ANALYTICS_STEP_NUMBERS.advanced && (
        <Fragment>
          <AdvancedStepDetails state={state} />
          <EuiSpacer />
          <EuiButton
            iconType="pencil"
            size="s"
            onClick={() => {
              setCurrentStep(ANALYTICS_STEP_NUMBERS.advanced);
            }}
          >
            {i18n.translate('xpack.ml.dataframe.analytics.create.advancedDetails.editButtonText', {
              defaultMessage: 'Edit',
            })}
          </EuiButton>
        </Fragment>
      )}
    </EuiForm>
  );
};
