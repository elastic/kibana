/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';

import { AGENTLESS_POLICY_ID } from '../../../../../../../../common/constants';
import { ExperimentalFeaturesService } from '../../../../../services';
import type { AgentPolicy, NewAgentPolicy } from '../../../../../types';
import { SetupType } from '../../../../../types';
import { sendGetOneAgentPolicy } from '../../../../../hooks';
import { SelectedPolicyTab } from '../../components';

export function useSetupType({
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
  const [selectedSetupType, setSelectedSetupType] = useState<SetupType>(SetupType.AGENT_BASED);
  const [agentlessPolicy, setAgentlessPolicy] = useState<AgentPolicy | undefined>();

  useEffect(() => {
    const fetchAgentlessPolicy = async () => {
      const { data, error } = await sendGetOneAgentPolicy(AGENTLESS_POLICY_ID);
      const isAgentlessAvailable = !error && data && data.item;

      if (isAgentlessAvailable) {
        setAgentlessPolicy(data.item);
      }
    };

    if (isAgentlessEnabled) {
      fetchAgentlessPolicy();
    }
  }, [isAgentlessEnabled]);

  const handleSetupTypeChange = useCallback(
    (setupType) => {
      if (!isAgentlessEnabled || setupType === selectedSetupType) {
        return;
      }

      if (setupType === SetupType.AGENTLESS) {
        if (agentlessPolicy) {
          updateAgentPolicy(agentlessPolicy);
          setSelectedPolicyTab(SelectedPolicyTab.EXISTING);
        }
      } else if (setupType === SetupType.AGENT_BASED) {
        updateNewAgentPolicy(newAgentPolicy);
        setSelectedPolicyTab(SelectedPolicyTab.NEW);
      }

      setSelectedSetupType(setupType);
    },
    [
      isAgentlessEnabled,
      selectedSetupType,
      agentlessPolicy,
      updateAgentPolicy,
      setSelectedPolicyTab,
      updateNewAgentPolicy,
      newAgentPolicy,
    ]
  );

  return {
    handleSetupTypeChange,
    agentlessPolicy,
    selectedSetupType,
  };
}
