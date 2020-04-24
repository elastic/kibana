/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment } from 'react';
import { EuiButton, EuiForm, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { CreateAnalyticsFormProps } from '../../../analytics_management/hooks/use_create_analytics_form';
import { ContinueButton } from '../continue_button';
import { ANALYTICS_STEP_NUMBERS } from '../../page';
import { ConfigurationStepDetails } from './configuration_step_details';
import { ConfigurationStepForm } from './configuration_step_form';

// TODO: validate index fields for whatever job type to ensure they are supported
// show error callout at the top with a link back to selection if not valid fields
export const ConfigurationStep: FC<CreateAnalyticsFormProps> = ({
  actions,
  state,
  setCurrentStep,
  step,
}) => {
  return (
    <EuiForm className="mlDataFrameAnalyticsCreateForm">
      {step === ANALYTICS_STEP_NUMBERS.configuration && (
        <Fragment>
          <ConfigurationStepForm actions={actions} state={state} />
          <EuiSpacer />
          <ContinueButton
            onClick={() => {
              setCurrentStep(ANALYTICS_STEP_NUMBERS.advanced);
            }}
          />
        </Fragment>
      )}
      {step !== ANALYTICS_STEP_NUMBERS.configuration && (
        <Fragment>
          <ConfigurationStepDetails state={state} />
          <EuiSpacer />
          <EuiButton
            iconType="pencil"
            size="s"
            onClick={() => {
              setCurrentStep(ANALYTICS_STEP_NUMBERS.configuration);
            }}
          >
            {i18n.translate('xpack.ml.dataframe.analytics.create.configDetails.editButtonText', {
              defaultMessage: 'Edit',
            })}
          </EuiButton>
        </Fragment>
      )}
    </EuiForm>
  );
};
