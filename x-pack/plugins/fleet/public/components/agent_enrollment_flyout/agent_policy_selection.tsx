/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiLink, EuiSelect, EuiSpacer } from '@elastic/eui';

import type { AgentPolicy } from '../../types';
import { AgentPolicyPackageBadges } from '../agent_policy_package_badges';

import { useCapabilities } from '../../hooks';

import { AdvancedAgentAuthenticationSettings } from './advanced_agent_authentication_settings';

const AgentPolicyFormRow = styled(EuiFormRow)`
  .euiFormRow__label {
    width: 100%;
  }
`;

type Props = {
  agentPolicies: AgentPolicy[];
  onAgentPolicyChange: (key?: string, policy?: AgentPolicy) => void;
  excludeFleetServer?: boolean;
  onClickCreatePolicy: () => void;
  selectedAgentPolicy?: string;
} & (
  | {
      withKeySelection: true;
      selectedApiKeyId?: string;
      onKeyChange?: (key?: string) => void;
    }
  | {
      withKeySelection: false;
    }
);

const resolveAgentId = (
  agentPolicies?: AgentPolicy[],
  selectedAgentPolicyId?: string
): undefined | string => {
  if (agentPolicies && agentPolicies.length && !selectedAgentPolicyId) {
    if (agentPolicies.length === 1) {
      return agentPolicies[0].id;
    }
  }

  return selectedAgentPolicyId;
};

export const EnrollmentStepAgentPolicy: React.FC<Props> = (props) => {
  const {
    agentPolicies,
    onAgentPolicyChange,
    excludeFleetServer,
    onClickCreatePolicy,
    selectedAgentPolicy,
  } = props;

  const [selectedAgentPolicyId, setSelectedAgentPolicyId] = useState<undefined | string>(
    () => resolveAgentId(agentPolicies, undefined) // no agent id selected yet
  );

  // Create new agent policy flyout state
  const hasWriteCapabilites = useCapabilities().write;

  useEffect(
    function triggerOnAgentPolicyChangeEffect() {
      if (onAgentPolicyChange) {
        onAgentPolicyChange(selectedAgentPolicyId);
      }
    },
    [selectedAgentPolicyId, onAgentPolicyChange]
  );

  useEffect(
    function useDefaultAgentPolicyEffect() {
      const resolvedId = resolveAgentId(agentPolicies, selectedAgentPolicyId);
      if (resolvedId !== selectedAgentPolicyId) {
        setSelectedAgentPolicyId(resolvedId);
      }
    },
    [agentPolicies, selectedAgentPolicyId]
  );

  useEffect(() => {
    if (selectedAgentPolicy) setSelectedAgentPolicyId(selectedAgentPolicy);
  }, [selectedAgentPolicy]);

  return (
    <>
      <AgentPolicyFormRow
        fullWidth={true}
        label={
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <div>
                <EuiLink disabled={!hasWriteCapabilites} onClick={onClickCreatePolicy}>
                  <FormattedMessage
                    id="xpack.fleet.enrollmentStepAgentPolicy.addPolicyButton"
                    defaultMessage="Create new agent policy"
                  />
                </EuiLink>
              </div>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      >
        <EuiSelect
          fullWidth
          isLoading={!agentPolicies}
          options={agentPolicies.map((agentPolicy: AgentPolicy) => ({
            value: agentPolicy.id,
            text: agentPolicy.name,
          }))}
          value={selectedAgentPolicyId || undefined}
          onChange={(e) => setSelectedAgentPolicyId(e.target.value)}
          aria-label={i18n.translate(
            'xpack.fleet.enrollmentStepAgentPolicy.policySelectAriaLabel',
            {
              defaultMessage: 'Agent policy',
            }
          )}
          hasNoInitialSelection={agentPolicies.length > 1}
          data-test-subj="agentPolicyDropdown"
        />
      </AgentPolicyFormRow>
      <EuiSpacer size="m" />
      {selectedAgentPolicyId && (
        <AgentPolicyPackageBadges
          agentPolicyId={selectedAgentPolicyId}
          excludeFleetServer={excludeFleetServer}
        />
      )}
      {props.withKeySelection && props.onKeyChange && (
        <>
          <EuiSpacer />
          <AdvancedAgentAuthenticationSettings
            selectedApiKeyId={props.selectedApiKeyId}
            onKeyChange={props.onKeyChange}
            initialAuthenticationSettingsOpen={!props.selectedApiKeyId}
            agentPolicyId={selectedAgentPolicyId}
          />
        </>
      )}
    </>
  );
};
