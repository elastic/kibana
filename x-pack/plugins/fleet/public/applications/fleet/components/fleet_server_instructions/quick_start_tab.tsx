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
import { useLatestFleetServers } from './hooks/use_latest_fleet_servers';

interface Props {
  onClose: () => void;
}

export const QuickStartTab: React.FunctionComponent<Props> = ({ onClose }) => {
  const {
    fleetServerHost,
    setFleetServerHost,
    fleetServerHosts,
    fleetServerPolicyId,
    serviceToken,
    status,
    error,
    submit,
    inputs,
  } = useQuickStartCreateForm();

  const { isFleetServerReady } = useWaitForFleetServer();
  const { hasRecentlyEnrolledFleetServers } = useLatestFleetServers();

  const steps = [
    getGettingStartedStep({
      fleetServerHosts,
      fleetServerHost,
      setFleetServerHost,
      fleetServerPolicyId,
      serviceToken,
      status,
      error,
      submit,
      isFleetServerHostSubmitted: false,
      inputs,
      onClose,
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
      hasRecentlyEnrolledFleetServers,
      disabled: status !== 'success',
    }),
  ];

  return <EuiSteps steps={steps} className="eui-textLeft" />;
};
