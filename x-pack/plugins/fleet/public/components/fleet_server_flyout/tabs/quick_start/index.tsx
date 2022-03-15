/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import type { EuiStepProps } from '@elastic/eui';
import { EuiSteps } from '@elastic/eui';

import { useQuickStartCreateForm, useWaitForFleetServer } from '../../hooks';

import {
  getConfirmFleetServerConnectionStep,
  getGettingStartedStep,
  getInstallFleetServerStep,
} from './steps';

export const QuickStartTab: React.FunctionComponent = () => {
  const [fleetServerHost, setFleetServerHost] = useState('');
  const quickStartCreateForm = useQuickStartCreateForm();
  const { isFleetServerReady } = useWaitForFleetServer();

  const steps = useMemo<EuiStepProps[]>(() => {
    return [
      getGettingStartedStep({
        fleetServerHost,
        onFleetServerHostChange: (value) => setFleetServerHost(value),
        quickStartCreateForm,
      }),
      getInstallFleetServerStep({
        isFleetServerReady,
        quickStartCreateForm,
      }),
      getConfirmFleetServerConnectionStep({
        isFleetServerReady,
        quickStartCreateForm,
      }),
    ];
  }, [fleetServerHost, isFleetServerReady, quickStartCreateForm]);

  return <EuiSteps steps={steps} />;
};
