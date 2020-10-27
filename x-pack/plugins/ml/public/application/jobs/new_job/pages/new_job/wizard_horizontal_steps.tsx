/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { i18n } from '@kbn/i18n';

import { EuiStepsHorizontal } from '@elastic/eui';
import { WIZARD_STEPS } from '../components/step_types';
import { JOB_TYPE } from '../../../../../../common/constants/new_job';

interface Props {
  currentStep: WIZARD_STEPS;
  highestStep: WIZARD_STEPS;
  setCurrentStep: React.Dispatch<React.SetStateAction<WIZARD_STEPS>>;
  disableSteps: boolean;
  jobType: JOB_TYPE;
}

export const WizardHorizontalSteps: FC<Props> = ({
  currentStep,
  highestStep,
  setCurrentStep,
  disableSteps,
  jobType,
}) => {
  function jumpToStep(step: WIZARD_STEPS) {
    if (step <= highestStep) {
      setCurrentStep(step);
    }
  }

  const stepsConfig = [
    {
      title: i18n.translate('xpack.ml.newJob.wizard.step.timeRangeTitle', {
        defaultMessage: 'Time range',
      }),
      ...createStepProps(WIZARD_STEPS.TIME_RANGE),
    },
    {
      title: i18n.translate('xpack.ml.newJob.wizard.step.pickFieldsTitle', {
        defaultMessage: 'Pick fields',
      }),
      ...createStepProps(WIZARD_STEPS.PICK_FIELDS),
    },
    {
      title: i18n.translate('xpack.ml.newJob.wizard.step.jobDetailsTitle', {
        defaultMessage: 'Job details',
      }),
      ...createStepProps(WIZARD_STEPS.JOB_DETAILS),
    },
    {
      title: i18n.translate('xpack.ml.newJob.wizard.step.validationTitle', {
        defaultMessage: 'Validation',
      }),
      ...createStepProps(WIZARD_STEPS.VALIDATION),
    },
    {
      title: i18n.translate('xpack.ml.newJob.wizard.step.summaryTitle', {
        defaultMessage: 'Summary',
      }),
      ...createStepProps(WIZARD_STEPS.SUMMARY),
    },
  ];

  if (jobType === JOB_TYPE.ADVANCED) {
    stepsConfig.splice(0, 1, {
      title: i18n.translate('xpack.ml.newJob.wizard.step.configureDatafeedTitle', {
        defaultMessage: 'Configure datafeed',
      }),
      ...createStepProps(WIZARD_STEPS.ADVANCED_CONFIGURE_DATAFEED),
    });
  }

  function createStepProps(step: WIZARD_STEPS) {
    return {
      onClick: () => jumpToStep(step),
      isSelected: currentStep === step,
      isComplete: currentStep > step,
      disabled: disableSteps || highestStep < step,
    };
  }

  return <EuiStepsHorizontal steps={stepsConfig} style={{ backgroundColor: 'inherit' }} />;
};
