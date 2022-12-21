/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiStepsHorizontal, EuiStepStatus } from '@elastic/eui';
import { useServices } from '../../app_context';

interface Props {
  currentStep: number;
  maxCompletedStep: number;
  updateCurrentStep: (step: number) => void;
}

export const RestoreSnapshotNavigation: React.FunctionComponent<Props> = ({
  currentStep,
  maxCompletedStep,
  updateCurrentStep,
}) => {
  const { i18n } = useServices();

  const steps = [
    {
      title: i18n.translate('xpack.snapshotRestore.restoreForm.navigation.stepLogisticsName', {
        defaultMessage: 'Logistics',
      }),
      status: (currentStep === 1
        ? 'selected'
        : maxCompletedStep >= 1
        ? 'complete'
        : 'incomplete') as EuiStepStatus,
      onClick: () => updateCurrentStep(1),
    },
    {
      title: i18n.translate('xpack.snapshotRestore.restoreForm.navigation.stepSettingsName', {
        defaultMessage: 'Index settings',
      }),
      status: (currentStep === 2
        ? 'selected'
        : maxCompletedStep >= 2
        ? 'complete'
        : 'incomplete') as EuiStepStatus,
      disabled: maxCompletedStep < 1,
      onClick: () => updateCurrentStep(2),
    },
    {
      title: i18n.translate('xpack.snapshotRestore.restoreForm.navigation.stepReviewName', {
        defaultMessage: 'Review',
      }),
      status: (currentStep === 3
        ? 'selected'
        : maxCompletedStep >= 2
        ? 'complete'
        : 'incomplete') as EuiStepStatus,
      disabled: maxCompletedStep < 2,
      onClick: () => updateCurrentStep(3),
    },
  ];

  return <EuiStepsHorizontal steps={steps} />;
};
