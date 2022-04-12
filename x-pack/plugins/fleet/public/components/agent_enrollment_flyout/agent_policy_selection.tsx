/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLink,
  EuiSelect,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import type { AgentPolicy } from '../../types';
import { AgentPolicyPackageBadges } from '../agent_policy_package_badges';

import { useAuthz } from '../../hooks';

import { AdvancedAgentAuthenticationSettings } from './advanced_agent_authentication_settings';

const AgentPolicyFormRow = styled(EuiFormRow)`
  .euiFormRow__label {
    width: 100%;
  }
`;

type Props = {
  agentPolicies: AgentPolicy[];
  selectedPolicyId?: string;
  setSelectedPolicyId: (agentPolicyId?: string) => void;
  excludeFleetServer?: boolean;
  onClickCreatePolicy: () => void;
  isFleetServerPolicy?: boolean;
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

export const AgentPolicySelection: React.FC<Props> = (props) => {
  const {
    agentPolicies,
    selectedPolicyId,
    setSelectedPolicyId,
    excludeFleetServer,
    onClickCreatePolicy,
    isFleetServerPolicy,
  } = props;

  const hasFleetAllPrivileges = useAuthz().fleet.all;

  const onChangeCallback = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target;
    setSelectedPolicyId(value);
  };

  return (
    <>
      <EuiText>
        {isFleetServerPolicy ? (
          <FormattedMessage
            id="xpack.fleet.enrollmentStepAgentPolicy.selectAgentPolicyFleetServerText"
            defaultMessage="Fleet Server runs on Elastic Agent, and agents are enrolled in agent policies which represent hosts. You can select an existing agent policy configured for Fleet Server, or you may choose to create a new one."
          />
        ) : (
          <FormattedMessage
            id="xpack.fleet.enrollmentStepAgentPolicy.createAgentPolicyText"
            defaultMessage="Type of hosts are controlled by an {agentPolicy}. Choose an agent policy or create a new one."
            values={{
              agentPolicy: (
                <EuiLink
                  href={'https://www.elastic.co/guide/en/fleet/current/agent-policy.html'}
                  target="_blank"
                >
                  <FormattedMessage
                    id="xpack.fleet.agentPolicyForm.createAgentPolicyDocLink"
                    defaultMessage="agent policy"
                  />
                </EuiLink>
              ),
            }}
          />
        )}
      </EuiText>
      <AgentPolicyFormRow
        fullWidth={true}
        label={
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <div>
                <EuiLink disabled={!hasFleetAllPrivileges} onClick={onClickCreatePolicy}>
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
          value={selectedPolicyId}
          onChange={onChangeCallback}
          aria-label={i18n.translate(
            'xpack.fleet.enrollmentStepAgentPolicy.policySelectAriaLabel',
            {
              defaultMessage: 'Agent policy',
            }
          )}
          hasNoInitialSelection={!selectedPolicyId}
          data-test-subj="agentPolicyDropdown"
          isInvalid={!selectedPolicyId}
        />
      </AgentPolicyFormRow>
      {selectedPolicyId && !isFleetServerPolicy && (
        <>
          <EuiSpacer size="m" />
          <AgentPolicyPackageBadges
            agentPolicyId={selectedPolicyId}
            excludeFleetServer={excludeFleetServer}
          />
        </>
      )}
      {props.withKeySelection && props.onKeyChange && (
        <>
          <EuiSpacer />
          <AdvancedAgentAuthenticationSettings
            selectedApiKeyId={props.selectedApiKeyId}
            onKeyChange={props.onKeyChange}
            initialAuthenticationSettingsOpen={!props.selectedApiKeyId}
            agentPolicyId={selectedPolicyId}
          />
        </>
      )}
    </>
  );
};
