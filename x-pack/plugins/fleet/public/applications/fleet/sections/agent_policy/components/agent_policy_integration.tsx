/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiDescribedFormGroup,
  EuiForm,
  EuiHorizontalRule,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import styled from 'styled-components';

import type { NewAgentPolicy, AgentPolicy } from '../../../types';

import { AgentPolicyAdvancedOptionsContent } from './agent_policy_advanced_fields';
import { AgentPolicyGeneralFields } from './agent_policy_general_fields';
import { AgentPolicyFormSystemMonitoringCheckbox } from './agent_policy_system_monitoring_field';
import type { ValidationResults } from './agent_policy_validation';

const StyledEuiAccordion = styled(EuiAccordion)`
  .ingest-active-button {
    color: ${(props) => props.theme.eui.euiColorPrimary};
  }
`;

interface Props {
  agentPolicy: Partial<NewAgentPolicy | AgentPolicy>;
  updateAgentPolicy: (u: Partial<NewAgentPolicy | AgentPolicy>) => void;
  withSysMonitoring: boolean;
  updateSysMonitoring: (newValue: boolean) => void;
  validation: ValidationResults;
  isEditing?: boolean;
  onDelete?: () => void;
}

export const AgentPolicyIntegrationForm: React.FunctionComponent<Props> = ({
  agentPolicy,
  updateAgentPolicy,
  withSysMonitoring,
  updateSysMonitoring,
  validation,
  isEditing = false,
  onDelete = () => {},
}) => {
  return (
    <EuiForm>
      <EuiDescribedFormGroup
        title={
          <h4>
            <FormattedMessage
              id="xpack.fleet.agentPolicyForm.createAgentPolicyLabel"
              defaultMessage="Create agent policy"
            />
          </h4>
        }
        description={
          <FormattedMessage
            id="xpack.fleet.agentPolicyForm.createAgentPolicyDescription"
            defaultMessage="Add this integration to a new set of hosts by creating a new agent policy. You can add agent in the next step."
          />
        }
      >
        <AgentPolicyGeneralFields
          agentPolicy={agentPolicy}
          updateAgentPolicy={updateAgentPolicy}
          validation={validation}
          nameLabel={
            <FormattedMessage
              id="xpack.fleet.agentPolicyForm.newAgentPolicyFieldLabel"
              defaultMessage="New agent policy name"
            />
          }
        />

        <AgentPolicyFormSystemMonitoringCheckbox
          withSysMonitoring={withSysMonitoring}
          updateSysMonitoring={updateSysMonitoring}
        />
      </EuiDescribedFormGroup>
      <>
        <EuiHorizontalRule />
        <EuiSpacer size="xs" />
        <StyledEuiAccordion
          id="advancedOptions"
          buttonContent={
            <FormattedMessage
              id="xpack.fleet.agentPolicyForm.advancedOptionsToggleLabel"
              defaultMessage="Advanced options"
            />
          }
          buttonClassName="ingest-active-button"
          data-test-subj="advancedOptionsBtn"
        >
          <EuiSpacer size="l" />
          <AgentPolicyAdvancedOptionsContent
            agentPolicy={agentPolicy}
            updateAgentPolicy={updateAgentPolicy}
            validation={validation}
            isEditing={isEditing}
            onDelete={onDelete}
          />
        </StyledEuiAccordion>
      </>
    </EuiForm>
  );
};
