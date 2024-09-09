/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useState } from 'react';

import { NewPackagePolicyInput } from '@kbn/fleet-plugin/common';
import { SetupTechnology } from '@kbn/fleet-plugin/public';
import { CLOUDBEAT_AWS, CLOUDBEAT_GCP, CLOUDBEAT_AZURE } from '../../../../common/constants';

export const useSetupTechnology = ({
  input,
  isAgentlessEnabled,
  handleSetupTechnologyChange,
  isEditPage,
}: {
  input: NewPackagePolicyInput;
  isAgentlessEnabled?: boolean;
  handleSetupTechnologyChange?: (value: SetupTechnology) => void;
  isEditPage?: boolean;
}) => {
  const isCspmAws = input.type === CLOUDBEAT_AWS;
  const isCspmGcp = input.type === CLOUDBEAT_GCP;
  const isCspmAzure = input.type === CLOUDBEAT_AZURE;
  const isAgentlessSupportedForCloudProvider = isCspmAws || isCspmGcp || isCspmAzure;
  const isAgentlessAvailable = isAgentlessSupportedForCloudProvider && isAgentlessEnabled;
  const defaultSetupTechnology =
    isEditPage && isAgentlessEnabled ? SetupTechnology.AGENTLESS : SetupTechnology.AGENT_BASED;
  const [setupTechnology, setSetupTechnology] = useState<SetupTechnology>(defaultSetupTechnology);

  const updateSetupTechnology = (value: SetupTechnology) => {
    setSetupTechnology(value);
    if (handleSetupTechnologyChange) {
      handleSetupTechnologyChange(value);
    }
  };

  return {
    isAgentlessAvailable,
    setupTechnology,
    setSetupTechnology,
    updateSetupTechnology,
  };
};
