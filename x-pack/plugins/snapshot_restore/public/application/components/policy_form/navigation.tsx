/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiStepsHorizontal } from '@elastic/eui';
import { useServices } from '../../app_context';

interface Props {
  currentStep: number;
  maxCompletedStep: number;
  updateCurrentStep: (step: number) => void;
  isFormValid: boolean;
}

export const PolicyNavigation: React.FunctionComponent<Props> = ({
  currentStep,
  maxCompletedStep,
  updateCurrentStep,
  isFormValid,
}) => {
  const { i18n } = useServices();

  const steps = [
    {
      title: i18n.translate('xpack.snapshotRestore.policyForm.navigation.stepLogisticsName', {
        defaultMessage: 'Logistics',
      }),
      isComplete: maxCompletedStep >= 1,
      isSelected: currentStep === 1,
      disabled: !isFormValid && currentStep !== 1,
      onClick: () => updateCurrentStep(1),
    },
    {
      title: i18n.translate('xpack.snapshotRestore.policyForm.navigation.stepSettingsName', {
        defaultMessage: 'Snapshot settings',
      }),
      isComplete: maxCompletedStep >= 2,
      isSelected: currentStep === 2,
      disabled: maxCompletedStep < 1 || (!isFormValid && currentStep !== 2),
      onClick: () => updateCurrentStep(2),
    },
    {
      title: i18n.translate('xpack.snapshotRestore.policyForm.navigation.stepRetentionName', {
        defaultMessage: 'Snapshot retention',
      }),
      isComplete: maxCompletedStep >= 3,
      isSelected: currentStep === 3,
      disabled: maxCompletedStep < 2 || (!isFormValid && currentStep !== 3),
      onClick: () => updateCurrentStep(3),
    },
    {
      title: i18n.translate('xpack.snapshotRestore.policyForm.navigation.stepReviewName', {
        defaultMessage: 'Review',
      }),
      isComplete: maxCompletedStep >= 3,
      isSelected: currentStep === 4,
      disabled: maxCompletedStep < 3 || (!isFormValid && currentStep !== 4),
      onClick: () => updateCurrentStep(4),
    },
  ];

  return <EuiStepsHorizontal steps={steps} />;
};
