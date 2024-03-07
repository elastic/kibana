/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { i18n } from '@kbn/i18n';

import { WIZARD_STEPS } from '../../state_management/wizard_slice';
import { useWizardActions, useWizardSelector } from '../../state_management/create_transform_store';

import { WizardNav } from '../wizard_nav';

import { StepCreateForm } from './step_create_form';
import { StepCreateSummary } from './step_create_summary';

const StepCreate: FC = () => {
  const currentStep = useWizardSelector((s) => s.wizard.currentStep);
  const created = useWizardSelector((s) => s.stepCreate.created);

  const { setCurrentStep } = useWizardActions();

  return (
    <>
      {currentStep === WIZARD_STEPS.CREATE ? <StepCreateForm /> : <StepCreateSummary />}
      {currentStep === WIZARD_STEPS.CREATE && !created && (
        <WizardNav previous={() => setCurrentStep(WIZARD_STEPS.DETAILS)} />
      )}
    </>
  );
};

export const euiStepCreate = {
  title: i18n.translate('xpack.transform.transformsWizard.stepCreateTitle', {
    defaultMessage: 'Create',
  }),
  children: <StepCreate />,
};
