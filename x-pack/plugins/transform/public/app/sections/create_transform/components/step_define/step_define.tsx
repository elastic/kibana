/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';
import { useSelector } from 'react-redux';

import { i18n } from '@kbn/i18n';

import { useWizardActions, useWizardSelector } from '../../state_management/create_transform_store';
import { selectTransformConfigValid } from '../../state_management/step_define_selectors';
import { WIZARD_STEPS } from '../../state_management/wizard_slice';

import { WizardNav } from '../wizard_nav';

import { StepDefineForm } from './step_define_form';
import { StepDefineSummary } from './step_define_summary';

export const StepDefine: FC = () => {
  const currentStep = useWizardSelector((s) => s.wizard.currentStep);
  const stepDefineState = useWizardSelector((s) => s.stepDefine);
  const transformConfigValid = useSelector(selectTransformConfigValid);

  const { setCurrentStep } = useWizardActions();

  return stepDefineState ? (
    <>
      {currentStep === WIZARD_STEPS.DEFINE ? (
        <>
          <StepDefineForm />
          <WizardNav
            next={() => setCurrentStep(WIZARD_STEPS.DETAILS)}
            nextActive={transformConfigValid}
          />
        </>
      ) : (
        <StepDefineSummary />
      )}
    </>
  ) : null;
};

export const euiStepDefine = {
  title: i18n.translate('xpack.transform.transformsWizard.stepConfigurationTitle', {
    defaultMessage: 'Configuration',
  }),
  children: <StepDefine />,
};
