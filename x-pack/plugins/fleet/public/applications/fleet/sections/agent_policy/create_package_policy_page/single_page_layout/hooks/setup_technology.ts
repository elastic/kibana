/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';

import { ExperimentalFeaturesService } from '../../../../../services';
import type { AgentPolicy, NewAgentPolicy } from '../../../../../types';
import { SetupTechnology } from '../../../../../types';
import { sendGetOneAgentPolicy, useStartServices } from '../../../../../hooks';
import { SelectedPolicyTab } from '../../components';

const AGENTLESS_POLICY_ID = 'agentless';

export function useSetupTechnology({
  updateNewAgentPolicy,
  newAgentPolicy,
  updateAgentPolicy,
  setSelectedPolicyTab,
}: {
  updateNewAgentPolicy: (policy: NewAgentPolicy) => void;
  newAgentPolicy: NewAgentPolicy;
  updateAgentPolicy: (policy: AgentPolicy) => void;
  setSelectedPolicyTab: (tab: SelectedPolicyTab) => void;
}) {
  const { agentless: isAgentlessEnabled } = ExperimentalFeaturesService.get();
  const { cloud } = useStartServices();
  const isServerless = cloud?.isServerlessEnabled ?? false;
  const [selectedSetupTechnology, setSelectedSetupTechnology] = useState<SetupTechnology>(
    SetupTechnology.AGENT_BASED
  );
  const [agentlessPolicy, setAgentlessPolicy] = useState<AgentPolicy | undefined>();

  useEffect(() => {
    const fetchAgentlessPolicy = async () => {
      const { data, error } = await sendGetOneAgentPolicy(AGENTLESS_POLICY_ID);
      const isAgentlessAvailable = !error && data && data.item;

      if (isAgentlessAvailable) {
        setAgentlessPolicy(data.item);
      }
    };

    if (isAgentlessEnabled && isServerless) {
      fetchAgentlessPolicy();
    }
  }, [isAgentlessEnabled, isServerless]);

  const handleSetupTechnologyChange = useCallback(
    (setupTechnology) => {
      if (!isAgentlessEnabled || setupTechnology === selectedSetupTechnology) {
        return;
      }

      if (setupTechnology === SetupTechnology.AGENTLESS) {
        if (agentlessPolicy) {
          updateAgentPolicy(agentlessPolicy);
          setSelectedPolicyTab(SelectedPolicyTab.EXISTING);
        }
      } else if (setupTechnology === SetupTechnology.AGENT_BASED) {
        updateNewAgentPolicy(newAgentPolicy);
        setSelectedPolicyTab(SelectedPolicyTab.NEW);
      }

      setSelectedSetupTechnology(setupTechnology);
    },
    [
      isAgentlessEnabled,
      selectedSetupTechnology,
      agentlessPolicy,
      updateAgentPolicy,
      setSelectedPolicyTab,
      updateNewAgentPolicy,
      newAgentPolicy,
    ]
  );

  return {
    handleSetupTechnologyChange,
    agentlessPolicy,
    selectedSetupTechnology,
  };
}
