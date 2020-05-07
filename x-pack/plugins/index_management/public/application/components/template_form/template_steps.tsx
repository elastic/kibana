/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiStepsHorizontal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface Props {
  currentStep: number;
  updateCurrentStep: (step: number, maxCompletedStep: number) => void;
  isCurrentStepValid: boolean | undefined;
}

const stepNamesMap: { [key: number]: string } = {
  1: i18n.translate('xpack.idxMgmt.templateForm.steps.logisticsStepName', {
    defaultMessage: 'Logistics',
  }),
  2: i18n.translate('xpack.idxMgmt.templateForm.steps.settingsStepName', {
    defaultMessage: 'Index settings',
  }),
  3: i18n.translate('xpack.idxMgmt.templateForm.steps.mappingsStepName', {
    defaultMessage: 'Mappings',
  }),
  4: i18n.translate('xpack.idxMgmt.templateForm.steps.aliasesStepName', {
    defaultMessage: 'Aliases',
  }),
  5: i18n.translate('xpack.idxMgmt.templateForm.steps.summaryStepName', {
    defaultMessage: 'Review template',
  }),
};

export const TemplateSteps: React.FunctionComponent<Props> = ({
  currentStep,
  updateCurrentStep,
  isCurrentStepValid,
}) => {
  const steps = [1, 2, 3, 4, 5].map(step => {
    return {
      title: stepNamesMap[step],
      isComplete: currentStep > step,
      isSelected: currentStep === step,
      disabled: step !== currentStep && isCurrentStepValid === false,
      onClick: () => updateCurrentStep(step, step - 1),
    };
  });

  return <EuiStepsHorizontal steps={steps} />;
};
