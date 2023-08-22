/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSteps, EuiStepStatus, EuiPageSection } from '@elastic/eui';

import { ConfigurationStep, FieldSelectionStep, CreateStep } from './steps';
import { useCreatePolicyContext } from './create_policy_context';

const CONFIGURATION = 1;
const FIELD_SELECTION = 2;
const CREATE = 3;

export const CreatePolicyWizard = () => {
  const { completionState } = useCreatePolicyContext();
  const [currentStep, setCurrentStep] = useState(CONFIGURATION);

  const getStepStatus = useCallback(
    (forStep: number): EuiStepStatus => {
      if (currentStep === forStep) {
        return 'current';
      }

      return 'incomplete';
    },
    [currentStep]
  );

  const stepDefinitions = useMemo(
    () => [
      {
        step: CONFIGURATION,
        title: i18n.translate('xpack.remoteClusters.clusterWizard.addConnectionInfoLabel', {
          defaultMessage: 'Configuration',
        }),
        status: completionState.configurationStep ? 'complete' : getStepStatus(CONFIGURATION),
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
        status: completionState.fieldsSelectionStep ? 'complete' : getStepStatus(FIELD_SELECTION),
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
    ],
    [currentStep, setCurrentStep, completionState, getStepStatus]
  );

  return (
    <EuiPageSection restrictWidth>
      <EuiSteps steps={stepDefinitions} />
    </EuiPageSection>
  );
};
