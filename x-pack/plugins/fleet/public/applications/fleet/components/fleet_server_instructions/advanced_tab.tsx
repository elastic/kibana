/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiSteps } from '@elastic/eui';
import React, { useState } from 'react';

import {
  useWaitForFleetServer,
  useSelectFleetServerPolicy,
  useServiceToken,
  useFleetServerHost,
} from './hooks';

import type { DeploymentMode } from './steps';
import {
  getAddFleetServerHostStep,
  getSelectAgentPolicyStep,
  getGenerateServiceTokenStep,
  getSetDeploymentModeStep,
  getInstallFleetServerStep,
  getConfirmFleetServerConnectionStep,
} from './steps';

export const AdvancedTab: React.FunctionComponent = () => {
  // The Advanced tab runs its operations in sequence unlike the Quick Start tab which combines operations. This is
  // why we pull everything from separate hooks here instead of a single unified hook like we do in the Quick Start tab.
  const {
    eligibleFleetServerPolicies,
    refreshEligibleFleetServerPolicies,
    fleetServerPolicyId,
    setFleetServerPolicyId,
  } = useSelectFleetServerPolicy();
  const { isFleetServerReady } = useWaitForFleetServer();
  const { serviceToken, isLoadingServiceToken, generateServiceToken } = useServiceToken();
  const fleetServerHostForm = useFleetServerHost();

  const [deploymentMode, setDeploymentMode] = useState<DeploymentMode>('quickstart');

  const steps = [
    getSelectAgentPolicyStep({
      policyId: fleetServerPolicyId,
      setPolicyId: setFleetServerPolicyId,
      eligibleFleetServerPolicies,
      refreshEligibleFleetServerPolicies,
    }),
    getSetDeploymentModeStep({ deploymentMode, setDeploymentMode, disabled: false }),
    getAddFleetServerHostStep({ fleetServerHostForm, disabled: false }),
    getGenerateServiceTokenStep({
      serviceToken,
      generateServiceToken,
      isLoadingServiceToken,
      disabled: false,
    }),
    getInstallFleetServerStep({
      isFleetServerReady,
      serviceToken,
      fleetServerHost: fleetServerHostForm.fleetServerHost,
      fleetServerPolicyId,
      disabled: false,
    }),
    getConfirmFleetServerConnectionStep({ isFleetServerReady, disabled: false }),
  ];

  return <EuiSteps steps={steps} className="eui-textLeft" />;
};
