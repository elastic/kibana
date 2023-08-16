/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSteps, EuiStepStatus, EuiPageSection } from '@elastic/eui';

import { ConfigurationStep, FieldSelectionStep, CreateStep } from './steps';

const CONFIGURATION = 1;
const FIELD_SELECTION = 2;
const CREATE = 3;

export const CreatePolicyWizard = () => {
  const [currentStep, setCurrentStep] = useState(CONFIGURATION);

  const stepDefinitions = useMemo(() => [
    {
      step: CONFIGURATION,
      title: i18n.translate('xpack.remoteClusters.clusterWizard.addConnectionInfoLabel', {
        defaultMessage: 'Configuration',
      }),
      status: (currentStep === CONFIGURATION ? 'current' : 'complete') as EuiStepStatus,
      onClick: () => currentStep !== CONFIGURATION && setCurrentStep(CONFIGURATION),
      children: currentStep === CONFIGURATION && (
        <ConfigurationStep onNext={() => setCurrentStep(FIELD_SELECTION)} />
      ),
    },
    {
      step: FIELD_SELECTION,
      title: i18n.translate('xpack.remoteClusters.clusterWizard.setupTrustLabel', {
        defaultMessage: 'Field selection',
      }),
      status: (currentStep === FIELD_SELECTION ? 'current' : 'incomplete') as EuiStepStatus,
      onClick: () => currentStep !== FIELD_SELECTION && setCurrentStep(FIELD_SELECTION),
      children: currentStep === FIELD_SELECTION && (
        <FieldSelectionStep onNext={() => setCurrentStep(CREATE)} />
      ),
    },
    {
      step: CREATE,
      title: i18n.translate('xpack.remoteClusters.clusterWizard.setupTrustLabel', {
        defaultMessage: 'Create',
      }),
      status: (currentStep === CREATE ? 'current' : 'incomplete') as EuiStepStatus,
      onClick: () => currentStep !== CREATE && setCurrentStep(CREATE),
      children: currentStep === CREATE && <CreateStep />,
    },
  ], [currentStep, setCurrentStep]);

  return (
    <EuiPageSection restrictWidth>
      <EuiSteps steps={stepDefinitions} />
    </EuiPageSection>
  );
};
