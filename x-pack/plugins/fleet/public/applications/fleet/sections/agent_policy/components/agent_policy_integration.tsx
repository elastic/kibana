/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescribedFormGroup, EuiForm } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { NewAgentPolicy, AgentPolicy } from '../../../types';

import { AgentPolicyGeneralFields } from './agent_policy_general_fields';
import { AgentPolicyFormSystemMonitoringCheckbox } from './agent_policy_system_monitoring_field';
import type { ValidationResults } from './agent_policy_validation';

interface Props {
  agentPolicy: Partial<NewAgentPolicy | AgentPolicy>;
  updateAgentPolicy: (u: Partial<NewAgentPolicy | AgentPolicy>) => void;
  withSysMonitoring: boolean;
  updateSysMonitoring: (newValue: boolean) => void;
  validation: ValidationResults;
}

export const AgentPolicyIntegrationForm: React.FunctionComponent<Props> = ({
  agentPolicy,
  updateAgentPolicy,
  withSysMonitoring,
  updateSysMonitoring,
  validation,
}) => {
  return (
    <EuiForm>
      <EuiDescribedFormGroup
        fullWidth
        title={
          <h3>
            <FormattedMessage
              id="xpack.fleet.agentPolicyForm.createAgentPolicyLabel"
              defaultMessage="Create agent policy"
            />
          </h3>
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
    </EuiForm>
  );
};
