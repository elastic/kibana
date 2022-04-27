/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import type { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';

import type { AgentPolicy } from '../../../types';

import { SelectCreateAgentPolicy } from '../agent_policy_select_create';

export const AgentPolicySelectionStep = ({
  agentPolicies,
  selectedPolicy,
  setSelectedPolicyId,
  selectedApiKeyId,
  setSelectedAPIKeyId,
  excludeFleetServer,
  refreshAgentPolicies,
}: {
  agentPolicies: AgentPolicy[];
  selectedPolicy?: AgentPolicy;
  setSelectedPolicyId: (agentPolicyId?: string) => void;
  selectedApiKeyId?: string;
  setSelectedAPIKeyId?: (key?: string) => void;
  excludeFleetServer?: boolean;
  refreshAgentPolicies: () => void;
}): EuiContainedStepProps => {
  return {
    title: i18n.translate('xpack.fleet.agentEnrollment.stepChooseAgentPolicyTitle', {
      defaultMessage: 'What type of host are you adding?',
    }),
    children: (
      <>
        <SelectCreateAgentPolicy
          agentPolicies={agentPolicies}
          selectedPolicy={selectedPolicy}
          setSelectedPolicyId={setSelectedPolicyId}
          withKeySelection={setSelectedAPIKeyId ? true : false}
          selectedApiKeyId={selectedApiKeyId}
          onKeyChange={setSelectedAPIKeyId}
          refreshAgentPolicies={refreshAgentPolicies}
          excludeFleetServer={excludeFleetServer}
        />
      </>
    ),
  };
};
