/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiStepsHorizontal, EuiStepStatus, EuiSpacer } from '@elastic/eui';

import { RemoteClusterSetupTrust, RemoteClusterForm } from '../components';

const CONFIGURE_CONNECTION = 1;
const SETUP_TRUST = 2;

interface Props {
  saveRemoteClusterConfig: (object: any) => void;
}

export const RemoteClusterWizard = ({ saveRemoteClusterConfig }: Props) => {
  const [formState, setFormState] = useState({} as any);
  const [currentStep, setCurrentStep] = useState(CONFIGURE_CONNECTION);

  const stepDefinitions = useMemo(
    () => [
      {
        step: CONFIGURE_CONNECTION,
        title: i18n.translate('xpack.remoteClusters.clusterWizard.addConnectionInfoLabel', {
          defaultMessage: 'Add connection information',
        }),
        status: (currentStep === CONFIGURE_CONNECTION ? 'current' : 'complete') as EuiStepStatus,
        onClick: () => {},
      },
      {
        step: SETUP_TRUST,
        title: i18n.translate('xpack.remoteClusters.clusterWizard.setupTrustLabel', {
          defaultMessage: 'Establish Trust',
        }),
        status: (currentStep === SETUP_TRUST ? 'current' : 'incomplete') as EuiStepStatus,
        onClick: () => {},
      },
    ],
    [currentStep]
  );

  const completeConfigStep = (clusterConfig: any) => {
    setFormState(clusterConfig);
    setCurrentStep(SETUP_TRUST);
  };

  const completeTrustStep = () => {
    console.log('complete trust step');
    console.log(formState);
    saveRemoteClusterConfig(formState);
  };

  return (
    <>
      <EuiStepsHorizontal steps={stepDefinitions} />
      <EuiSpacer size="xl" />

      {currentStep === CONFIGURE_CONNECTION && (
        <RemoteClusterForm
          isSaving={false}
          saveError={null}
          save={completeConfigStep}
          cancel={() => {
            console.log('cancel');
          }}
        />
      )}

      {currentStep === SETUP_TRUST && (
        <RemoteClusterSetupTrust
          onBack={() => setCurrentStep(CONFIGURE_CONNECTION)}
          onSubmit={completeTrustStep}
        />
      )}
    </>
  );
};
