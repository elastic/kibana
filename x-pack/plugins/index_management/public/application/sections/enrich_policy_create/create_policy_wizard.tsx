/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSteps, EuiStepStatus, EuiPageSection } from '@elastic/eui';

import { ConfigurationStep, FieldSelectionStep, CreateStep } from './steps';

const CONFIGURATION = 1;
const FIELD_SELECTION = 2;
const CREATE = 3;

interface Props {}

export const CreatePolicyWizard = ({}: Props) => {
  const [currentStep, setCurrentStep] = useState(CONFIGURATION);

  console.log(currentStep);

  const stepDefinitions = [
    {
      step: CONFIGURATION,
      title: i18n.translate('xpack.remoteClusters.clusterWizard.addConnectionInfoLabel', {
        defaultMessage: 'Configuration',
      }),
      status: (currentStep === CONFIGURATION ? 'current' : 'complete') as EuiStepStatus,
      onClick: () => setCurrentStep(CONFIGURATION),
      children: (
        <div style={{ display: currentStep === CONFIGURATION ? 'block' : 'none' }}>
          <ConfigurationStep
            onNext={() => {
              console.log('will change');
              setCurrentStep(FIELD_SELECTION);
            }}
          />
        </div>
      ),
    },
    {
      step: FIELD_SELECTION,
      title: i18n.translate('xpack.remoteClusters.clusterWizard.setupTrustLabel', {
        defaultMessage: 'Field selection',
      }),
      status: (currentStep === FIELD_SELECTION ? 'current' : 'incomplete') as EuiStepStatus,
      onClick: () => setCurrentStep(FIELD_SELECTION),
      children: currentStep === FIELD_SELECTION && <FieldSelectionStep />,
    },
    {
      step: CREATE,
      title: i18n.translate('xpack.remoteClusters.clusterWizard.setupTrustLabel', {
        defaultMessage: 'Create',
      }),
      status: (currentStep === CREATE ? 'current' : 'incomplete') as EuiStepStatus,
      onClick: () => setCurrentStep(CREATE),
      children: currentStep === CREATE && <CreateStep />,
    },
  ];

  return (
    <EuiPageSection restrictWidth>
      <EuiSteps steps={stepDefinitions} />
    </EuiPageSection>
  );
};
