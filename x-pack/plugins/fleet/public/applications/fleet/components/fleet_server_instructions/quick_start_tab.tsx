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
  const quickStartCreateForm = useQuickStartCreateForm();
  const { isFleetServerReady } = useWaitForFleetServer();

  const steps = [
    getGettingStartedStep({
      quickStartCreateForm,
    }),
    getInstallFleetServerStep({
      isFleetServerReady,
      fleetServerHost: quickStartCreateForm.fleetServerHost,
      fleetServerPolicyId: quickStartCreateForm.fleetServerPolicyId,
      serviceToken: quickStartCreateForm.serviceToken,
      disabled: quickStartCreateForm.status !== 'success',
    }),
    getConfirmFleetServerConnectionStep({
      isFleetServerReady,
      disabled: quickStartCreateForm.status !== 'success',
    }),
  ];

  return <EuiSteps steps={steps} className="eui-textLeft" />;
};
