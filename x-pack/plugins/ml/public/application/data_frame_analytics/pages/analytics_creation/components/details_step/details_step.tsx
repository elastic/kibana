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
import { DetailsStepDetails } from './details_step_details';
import { DetailsStepForm } from './details_step_form';

export const DetailsStep: FC<CreateAnalyticsFormProps> = ({
  actions,
  state,
  setCurrentStep,
  step,
}) => {
  return (
    <EuiForm className="mlDataFrameAnalyticsCreateForm">
      {step === ANALYTICS_STEP_NUMBERS.details && (
        <Fragment>
          <DetailsStepForm actions={actions} state={state} />
          <EuiSpacer />
          <ContinueButton
            onClick={() => {
              setCurrentStep(ANALYTICS_STEP_NUMBERS.create);
            }}
          />
        </Fragment>
      )}
      {step !== ANALYTICS_STEP_NUMBERS.details && (
        <Fragment>
          <DetailsStepDetails state={state} />
          <EuiSpacer />
          <EuiButton
            iconType="pencil"
            size="s"
            onClick={() => {
              setCurrentStep(ANALYTICS_STEP_NUMBERS.details);
            }}
          >
            {i18n.translate('xpack.ml.dataframe.analytics.create.detailsDetails.editButtonText', {
              defaultMessage: 'Edit',
            })}
          </EuiButton>
        </Fragment>
      )}
    </EuiForm>
  );
};
