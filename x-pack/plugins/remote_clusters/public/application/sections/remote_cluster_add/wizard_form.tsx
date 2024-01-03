/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiStepsHorizontal, EuiStepStatus, EuiSpacer, EuiPageSection } from '@elastic/eui';

import { RemoteClusterSetupTrust, RemoteClusterForm } from '../components';
import { ClusterPayload } from '../../../../common/lib/cluster_serialization';

const CONFIGURE_CONNECTION = 1;
const SETUP_TRUST = 2;

interface Props {
  saveRemoteClusterConfig: (config: ClusterPayload) => void;
  onCancel: () => void;
  addClusterError: { message: string } | undefined;
  isSaving: boolean;
}

export const RemoteClusterWizard = ({
  saveRemoteClusterConfig,
  onCancel,
  isSaving,
  addClusterError,
}: Props) => {
  const [formState, setFormState] = useState<ClusterPayload>();
  const [currentStep, setCurrentStep] = useState(CONFIGURE_CONNECTION);

  // If there was an error saving the cluster, we need
  // to send the user back to the first step.
  useEffect(() => {
    if (addClusterError) {
      setCurrentStep(CONFIGURE_CONNECTION);
    }
  }, [addClusterError, setCurrentStep]);

  const stepDefinitions = useMemo(
    () => [
      {
        step: CONFIGURE_CONNECTION,
        title: i18n.translate('xpack.remoteClusters.clusterWizard.addConnectionInfoLabel', {
          defaultMessage: 'Add connection information',
        }),
        status: (currentStep === CONFIGURE_CONNECTION ? 'current' : 'complete') as EuiStepStatus,
        onClick: () => setCurrentStep(CONFIGURE_CONNECTION),
      },
      {
        step: SETUP_TRUST,
        title: i18n.translate('xpack.remoteClusters.clusterWizard.setupTrustLabel', {
          defaultMessage: 'Establish trust',
        }),
        status: (currentStep === SETUP_TRUST ? 'current' : 'incomplete') as EuiStepStatus,
        disabled: !formState,
        onClick: () => setCurrentStep(SETUP_TRUST),
      },
    ],
    [currentStep, formState, setCurrentStep]
  );

  // Upon finalizing configuring the connection, we need to temporarily store the
  // cluster configuration so that we can persist it when the user completes the
  // trust step.
  const completeConfigStep = (clusterConfig: ClusterPayload) => {
    setFormState(clusterConfig);
    setCurrentStep(SETUP_TRUST);
  };

  const completeTrustStep = () => {
    saveRemoteClusterConfig(formState as ClusterPayload);
  };

  return (
    <EuiPageSection restrictWidth>
      <EuiStepsHorizontal steps={stepDefinitions} />
      <EuiSpacer size="xl" />

      {/*
        Instead of unmounting the Form, we toggle its visibility not to lose the form
        state when moving to the next step.
      */}
      <div style={{ display: currentStep === CONFIGURE_CONNECTION ? 'block' : 'none' }}>
        <RemoteClusterForm
          save={completeConfigStep}
          cancel={onCancel}
          saveError={addClusterError}
        />
      </div>

      {currentStep === SETUP_TRUST && (
        <RemoteClusterSetupTrust
          onBack={() => setCurrentStep(CONFIGURE_CONNECTION)}
          onSubmit={completeTrustStep}
          isSaving={isSaving}
        />
      )}
    </EuiPageSection>
  );
};
