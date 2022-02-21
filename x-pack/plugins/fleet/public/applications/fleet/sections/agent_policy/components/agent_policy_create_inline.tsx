/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiAccordion,
  EuiButton,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiLink,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';

import { dataTypes } from '../../../../../../common';
import { agentPolicyFormValidation } from '../components';

import type { AgentPolicy, NewAgentPolicy } from '../../../types';

import { sendCreateAgentPolicy } from '../../../hooks';

import { AgentPolicyAdvancedOptionsContent } from './agent_policy_advanced_fields';
import { AgentPolicyFormSystemMonitoringCheckbox } from './agent_policy_system_monitoring_field';

const StyledEuiAccordion = styled(EuiAccordion)`
  .ingest-active-button {
    color: ${(props) => props.theme.eui.euiColorPrimary};
  }
`;

interface Props {
  updateAgentPolicy: (u: AgentPolicy | null, errorMessage?: JSX.Element) => void;
  isFleetServerPolicy?: boolean;
  agentPolicyName: string;
}

export const AgentPolicyCreateInlineForm: React.FunctionComponent<Props> = ({
  updateAgentPolicy,
  isFleetServerPolicy,
  agentPolicyName,
}) => {
  const [touchedFields, setTouchedFields] = useState<{ [key: string]: boolean }>({});

  const [withSysMonitoring, setWithSysMonitoring] = useState<boolean>(true);

  const [isLoading, setIsLoading] = useState(false);

  const [newAgentPolicy, setNewAgentPolicy] = useState<NewAgentPolicy>({
    name: agentPolicyName,
    description: '',
    namespace: 'default',
    monitoring_enabled: Object.values(dataTypes),
    has_fleet_server: isFleetServerPolicy,
  });

  const updateNewAgentPolicy = useCallback(
    (updatedFields: Partial<NewAgentPolicy>) => {
      setNewAgentPolicy({
        ...newAgentPolicy,
        ...updatedFields,
      });
    },
    [setNewAgentPolicy, newAgentPolicy]
  );

  const validation = agentPolicyFormValidation(newAgentPolicy);

  const createAgentPolicy = useCallback(async () => {
    try {
      setIsLoading(true);
      const resp = await sendCreateAgentPolicy(newAgentPolicy, { withSysMonitoring });
      if (resp.error) throw resp.error;
      if (resp.data) {
        updateAgentPolicy(resp.data.item);
      }
    } catch (e) {
      updateAgentPolicy(null, mapError(e));
    } finally {
      setIsLoading(false);
    }
  }, [newAgentPolicy, withSysMonitoring, updateAgentPolicy]);

  function mapError(e: { statusCode: number }): JSX.Element | undefined {
    switch (e.statusCode) {
      case 409:
        return (
          <FormattedMessage
            id="xpack.fleet.agentPolicyCreation.errorMessage"
            defaultMessage="An agent policy already exists with this name."
          />
        );
    }
  }

  return (
    <EuiForm>
      <EuiText>
        {isFleetServerPolicy ? (
          <FormattedMessage
            id="xpack.fleet.agentPolicyForm.createAgentPolicyFleetServer"
            defaultMessage="Fleet Server runs on Elastic Agent, and agents are enrolled in agent policies which represent hosts. We'll need to create a dedicated agent policy for Fleet Server to run on dedicated hosts."
          />
        ) : (
          <FormattedMessage
            id="xpack.fleet.agentPolicyForm.createAgentPolicyTypeOfHosts"
            defaultMessage="Type of hosts are controlled by an {agentPolicy}. Create a new agent policy to get started."
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
      <EuiSpacer size="s" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            key="name"
            error={touchedFields.name && validation.name ? validation.name : null}
          >
            <EuiFieldText
              fullWidth
              value={newAgentPolicy.name}
              disabled={isLoading}
              onChange={(e) => updateNewAgentPolicy({ name: e.target.value })}
              isInvalid={Boolean(touchedFields.name && validation.name)}
              onBlur={() => setTouchedFields({ ...touchedFields, name: true })}
              placeholder={i18n.translate('xpack.fleet.agentPolicyForm.nameFieldPlaceholder', {
                defaultMessage: 'Choose a name',
              })}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            color="primary"
            disabled={!newAgentPolicy.name}
            onClick={() => createAgentPolicy()}
            isLoading={isLoading}
            data-test-subj={isFleetServerPolicy ? 'createFleetServerPolicyBtn' : 'createPolicyBtn'}
          >
            <FormattedMessage
              id="xpack.fleet.agentPolicyForm.createAgentPolicyText"
              defaultMessage="Create policy"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <AgentPolicyFormSystemMonitoringCheckbox
        withSysMonitoring={withSysMonitoring}
        updateSysMonitoring={(value) => setWithSysMonitoring(value)}
      />

      <>
        <EuiSpacer size="s" />
        <StyledEuiAccordion
          id="advancedOptions"
          buttonContent={
            <FormattedMessage
              id="xpack.fleet.agentPolicyForm.advancedOptionsToggleLabel"
              defaultMessage="Advanced options"
            />
          }
          buttonClassName="ingest-active-button"
        >
          <EuiSpacer size="l" />
          <AgentPolicyAdvancedOptionsContent
            agentPolicy={newAgentPolicy}
            updateAgentPolicy={updateNewAgentPolicy}
            validation={validation}
            isEditing={false}
            onDelete={() => {}}
          />
        </StyledEuiAccordion>
      </>
    </EuiForm>
  );
};
