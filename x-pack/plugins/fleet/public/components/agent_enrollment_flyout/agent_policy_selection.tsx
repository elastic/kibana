/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiSelect, EuiSpacer, EuiText } from '@elastic/eui';

import type { AgentPolicy } from '../../types';
import { AgentPolicyPackageBadges } from '../agent_policy_package_badges';

import { AdvancedAgentAuthenticationSettings } from './advanced_agent_authentication_settings';

type Props = {
  agentPolicies?: AgentPolicy[];
  onAgentPolicyChange?: (key?: string) => void;
  excludeFleetServer?: boolean;
} & (
  | {
      withKeySelection: true;
      onKeyChange?: (key?: string) => void;
    }
  | {
      withKeySelection: false;
    }
);

const resolveAgentId = (
  agentPolicies?: AgentPolicy[],
  selectedAgentId?: string
): undefined | string => {
  if (agentPolicies && agentPolicies.length && !selectedAgentId) {
    if (agentPolicies.length === 1) {
      return agentPolicies[0].id;
    }

    const defaultAgentPolicy = agentPolicies.find((agentPolicy) => agentPolicy.is_default);
    if (defaultAgentPolicy) {
      return defaultAgentPolicy.id;
    }
  }

  return selectedAgentId;
};

export const EnrollmentStepAgentPolicy: React.FC<Props> = (props) => {
  const { withKeySelection, agentPolicies, onAgentPolicyChange, excludeFleetServer } = props;
  const onKeyChange = props.withKeySelection && props.onKeyChange;
  const [selectedAgentId, setSelectedAgentId] = useState<undefined | string>(
    () => resolveAgentId(agentPolicies, undefined) // no agent id selected yet
  );

  useEffect(
    function triggerOnAgentPolicyChangeEffect() {
      if (onAgentPolicyChange) {
        onAgentPolicyChange(selectedAgentId);
      }
    },
    [selectedAgentId, onAgentPolicyChange]
  );

  useEffect(
    function useDefaultAgentPolicyEffect() {
      const resolvedId = resolveAgentId(agentPolicies, selectedAgentId);
      if (resolvedId !== selectedAgentId) {
        setSelectedAgentId(resolvedId);
      }
    },
    [agentPolicies, selectedAgentId]
  );

  return (
    <>
      <EuiSelect
        fullWidth
        prepend={
          <EuiText>
            <FormattedMessage
              id="xpack.fleet.enrollmentStepAgentPolicy.policySelectLabel"
              defaultMessage="Agent policy"
            />
          </EuiText>
        }
        isLoading={!agentPolicies}
        options={(agentPolicies || []).map((agentPolicy) => ({
          value: agentPolicy.id,
          text: agentPolicy.name,
        }))}
        value={selectedAgentId || undefined}
        onChange={(e) => setSelectedAgentId(e.target.value)}
        aria-label={i18n.translate('xpack.fleet.enrollmentStepAgentPolicy.policySelectAriaLabel', {
          defaultMessage: 'Agent policy',
        })}
      />
      <EuiSpacer size="m" />
      {selectedAgentId && (
        <AgentPolicyPackageBadges
          agentPolicyId={selectedAgentId}
          excludeFleetServer={excludeFleetServer}
        />
      )}
      {withKeySelection && onKeyChange && (
        <>
          <EuiSpacer />
          <AdvancedAgentAuthenticationSettings
            onKeyChange={onKeyChange}
            agentPolicyId={selectedAgentId}
          />
        </>
      )}
    </>
  );
};
