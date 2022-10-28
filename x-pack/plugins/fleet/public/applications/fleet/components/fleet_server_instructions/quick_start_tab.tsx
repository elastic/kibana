/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSteps } from '@elastic/eui';

import { useQuickStartCreateForm, useWaitForFleetServer } from './hooks';

import {
  getGettingStartedStep,
  getConfirmFleetServerConnectionStep,
  getInstallFleetServerStep,
} from './steps';

export const QuickStartTab: React.FunctionComponent = () => {
  const { fleetServerHost, fleetServerPolicyId, serviceToken, status, error, submit, inputs } =
    useQuickStartCreateForm();
  const { isFleetServerReady } = useWaitForFleetServer();

  const steps = [
    getGettingStartedStep({
      fleetServerHost,
      fleetServerPolicyId,
      serviceToken,
      status,
      error,
      submit,
      isFleetServerHostSubmitted: false,
      inputs,
    }),
    getInstallFleetServerStep({
      isFleetServerReady,
      fleetServerHost: fleetServerHost?.host_urls[0],
      fleetServerPolicyId,
      serviceToken,
      deploymentMode: 'quickstart',
      disabled: status !== 'success',
    }),
    getConfirmFleetServerConnectionStep({
      isFleetServerReady,
      disabled: status !== 'success',
    }),
  ];

  return <EuiSteps steps={steps} className="eui-textLeft" />;
};
