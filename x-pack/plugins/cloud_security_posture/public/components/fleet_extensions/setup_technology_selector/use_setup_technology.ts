/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useMemo, useState } from 'react';

import { AgentPolicy, NewPackagePolicyInput } from '@kbn/fleet-plugin/common';
import { SetupTechnology } from '@kbn/fleet-plugin/public';
import { CLOUDBEAT_AWS } from '../../../../common/constants';

export const useSetupTechnology = ({
  input,
  agentlessPolicy,
  handleSetupTechnologyChange,
}: {
  input: NewPackagePolicyInput;
  agentlessPolicy?: AgentPolicy;
  handleSetupTechnologyChange?: (value: SetupTechnology) => void;
}) => {
  const [setupTechnology, setSetupTechnology] = useState<SetupTechnology>(
    SetupTechnology.AGENT_BASED
  );
  const isCspmAws = input.type === CLOUDBEAT_AWS;
  const isAgentlessAvailable = useMemo(
    () => Boolean(isCspmAws && agentlessPolicy),
    [isCspmAws, agentlessPolicy]
  );

  useEffect(() => {
    if (isAgentlessAvailable) {
      setSetupTechnology(SetupTechnology.AGENTLESS);
    } else {
      setSetupTechnology(SetupTechnology.AGENT_BASED);
    }
  }, [isAgentlessAvailable]);

  useEffect(() => {
    if (handleSetupTechnologyChange) {
      handleSetupTechnologyChange(setupTechnology);
    }
  }, [handleSetupTechnologyChange, setupTechnology]);

  return {
    isAgentlessAvailable,
    setupTechnology,
    setSetupTechnology,
  };
};
