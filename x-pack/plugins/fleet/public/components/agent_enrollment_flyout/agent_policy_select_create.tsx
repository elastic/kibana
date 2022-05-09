/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';

import type { AgentPolicyCreateState } from '../../applications/fleet/sections/agents/components';
import {
  AgentPolicyCreatedCallOut,
  CREATE_STATUS,
} from '../../applications/fleet/sections/agents/components';
import { AgentPolicyCreateInlineForm } from '../../applications/fleet/sections/agent_policy/components';
import type { AgentPolicy } from '../../types';
import { incrementPolicyName } from '../../services';

import { AgentPolicySelection } from '.';

interface Props {
  agentPolicies: AgentPolicy[];
  selectedPolicyId?: string;
  setSelectedPolicyId: (agentPolicyId?: string) => void;
  excludeFleetServer?: boolean;
  withKeySelection: boolean;
  selectedApiKeyId?: string;
  onKeyChange?: (key?: string) => void;
  isFleetServerPolicy?: boolean;
  refreshAgentPolicies: () => void;
}

export const SelectCreateAgentPolicy: React.FC<Props> = ({
  agentPolicies,
  excludeFleetServer,
  setSelectedPolicyId,
  selectedPolicyId,
  withKeySelection,
  selectedApiKeyId,
  onKeyChange,
  isFleetServerPolicy,
  refreshAgentPolicies,
}) => {
  const regularAgentPolicies = useMemo(() => {
    return agentPolicies.filter(
      (policy) =>
        policy && !policy.is_managed && (!excludeFleetServer || !policy.is_default_fleet_server)
    );
  }, [agentPolicies, excludeFleetServer]);

  const onAgentPolicyChange = useCallback(
    async (key?: string, policy?: AgentPolicy) => {
      if (policy) {
        refreshAgentPolicies();
      }
    },
    [refreshAgentPolicies]
  );
  const [showCreatePolicy, setShowCreatePolicy] = useState(regularAgentPolicies.length === 0);

  const [createState, setCreateState] = useState<AgentPolicyCreateState>({
    status: CREATE_STATUS.INITIAL,
  });

  const [newName, setNewName] = useState(
    incrementPolicyName(regularAgentPolicies, isFleetServerPolicy)
  );

  useEffect(() => {
    setShowCreatePolicy(regularAgentPolicies.length === 0);
    setNewName(incrementPolicyName(regularAgentPolicies, isFleetServerPolicy));
  }, [regularAgentPolicies, isFleetServerPolicy]);

  const onAgentPolicyCreated = useCallback(
    async (policy: AgentPolicy | null, errorMessage?: JSX.Element) => {
      if (!policy) {
        setCreateState({ status: CREATE_STATUS.FAILED, errorMessage });
        return;
      }
      setShowCreatePolicy(false);
      setCreateState({ status: CREATE_STATUS.CREATED });
      if (onAgentPolicyChange) {
        onAgentPolicyChange(policy.id, policy!);
      }
      setSelectedPolicyId(policy.id);
    },
    [setSelectedPolicyId, onAgentPolicyChange]
  );

  const onClickCreatePolicy = () => {
    setCreateState({ status: CREATE_STATUS.INITIAL });
    setShowCreatePolicy(true);
    if (withKeySelection && onKeyChange) {
      onKeyChange(undefined);
    }
  };

  return (
    <>
      {showCreatePolicy ? (
        <AgentPolicyCreateInlineForm
          updateAgentPolicy={onAgentPolicyCreated}
          isFleetServerPolicy={isFleetServerPolicy}
          agentPolicyName={newName}
        />
      ) : (
        <AgentPolicySelection
          agentPolicies={regularAgentPolicies}
          withKeySelection={withKeySelection}
          selectedApiKeyId={selectedApiKeyId}
          onKeyChange={onKeyChange}
          excludeFleetServer={excludeFleetServer}
          onClickCreatePolicy={onClickCreatePolicy}
          selectedPolicyId={selectedPolicyId}
          setSelectedPolicyId={setSelectedPolicyId}
          isFleetServerPolicy={isFleetServerPolicy}
        />
      )}
      {createState.status !== CREATE_STATUS.INITIAL && (
        <AgentPolicyCreatedCallOut createState={createState} />
      )}
    </>
  );
};
