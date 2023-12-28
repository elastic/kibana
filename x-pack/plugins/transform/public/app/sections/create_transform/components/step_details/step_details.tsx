/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { i18n } from '@kbn/i18n';

import {
  useCreateTransformWizardActions,
  useCreateTransformWizardSelector,
  WIZARD_STEPS,
} from '../../create_transform_store';

import { WizardNav } from '../wizard_nav';

import { StepDetailsForm } from './step_details_form';
import { StepDetailsSummary } from './step_details_summary';

export const StepDetails: FC = () => {
  const currentStep = useCreateTransformWizardSelector((s) => s.wizard.currentStep);
  const stepDetailsState = useCreateTransformWizardSelector((s) => s.stepDetails);

  const { setCurrentStep, setStepDetailsState } = useCreateTransformWizardActions();

  return stepDetailsState ? (
    <>
      {currentStep === WIZARD_STEPS.DETAILS ? (
        <StepDetailsForm onChange={setStepDetailsState} overrides={stepDetailsState} />
      ) : (
        <StepDetailsSummary {...stepDetailsState} />
      )}
      {currentStep === WIZARD_STEPS.DETAILS && (
        <WizardNav
          previous={() => {
            setCurrentStep(WIZARD_STEPS.DEFINE);
          }}
          next={() => setCurrentStep(WIZARD_STEPS.CREATE)}
          nextActive={stepDetailsState.valid}
        />
      )}
    </>
  ) : null;
};

export const euiStepDetails = {
  title: i18n.translate('xpack.transform.transformsWizard.stepDetailsTitle', {
    defaultMessage: 'Transform details',
  }),
  children: <StepDetails />,
};
