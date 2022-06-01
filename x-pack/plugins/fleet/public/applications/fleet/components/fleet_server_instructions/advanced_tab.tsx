/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiSteps } from '@elastic/eui';
import React from 'react';

import { useAdvancedForm } from './hooks';

import {
  getAddFleetServerHostStep,
  getSelectAgentPolicyStep,
  getGenerateServiceTokenStep,
  getSetDeploymentModeStep,
  getInstallFleetServerStep,
  getConfirmFleetServerConnectionStep,
} from './steps';

interface AdvancedTabProps {
  selectedPolicyId?: string;
}

export const AdvancedTab: React.FunctionComponent<AdvancedTabProps> = ({ selectedPolicyId }) => {
  const {
    eligibleFleetServerPolicies,
    refreshEligibleFleetServerPolicies,
    fleetServerPolicyId,
    setFleetServerPolicyId,
    isFleetServerReady,
    serviceToken,
    isLoadingServiceToken,
    generateServiceToken,
    fleetServerHostForm,
    deploymentMode,
    setDeploymentMode,
  } = useAdvancedForm();

  const steps = [
    getSelectAgentPolicyStep({
      policyId: fleetServerPolicyId || selectedPolicyId,
      setPolicyId: setFleetServerPolicyId,
      eligibleFleetServerPolicies,
      refreshEligibleFleetServerPolicies,
    }),
    getSetDeploymentModeStep({
      deploymentMode,
      setDeploymentMode,
      disabled: !Boolean(fleetServerPolicyId),
    }),
    getAddFleetServerHostStep({ fleetServerHostForm, disabled: !Boolean(fleetServerPolicyId) }),
    getGenerateServiceTokenStep({
      serviceToken,
      generateServiceToken,
      isLoadingServiceToken,
      disabled: !Boolean(fleetServerHostForm.isFleetServerHostSubmitted),
    }),
    getInstallFleetServerStep({
      isFleetServerReady,
      serviceToken,
      fleetServerHost: fleetServerHostForm.fleetServerHost,
      fleetServerPolicyId,
      deploymentMode,
      disabled: !Boolean(serviceToken),
    }),
    getConfirmFleetServerConnectionStep({ isFleetServerReady, disabled: !Boolean(serviceToken) }),
  ];

  return <EuiSteps steps={steps} className="eui-textLeft" />;
};
