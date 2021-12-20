/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiTabbedContent } from '@elastic/eui';
import styled from 'styled-components';

import { useGetAgentPolicies } from '../../../hooks';
import type { AgentPolicy, NewAgentPolicy, PackageInfo } from '../../../types';
import { AgentPolicyIntegrationForm } from '../components';
import type { ValidationResults } from '../components/agent_policy_validation';

import { StepSelectAgentPolicy } from './step_select_agent_policy';

const StyledEuiTabbedContent = styled(EuiTabbedContent)`
  [role='tabpanel'] {
    padding-top: ${(props) => props.theme.eui.paddingSizes.m};
  }
`;

interface Props {
  agentPolicy: AgentPolicy | undefined;
  updateAgentPolicy: (u: AgentPolicy | undefined) => void;
  newAgentPolicy: Partial<NewAgentPolicy>;
  updateNewAgentPolicy: (u: Partial<NewAgentPolicy>) => void;
  withSysMonitoring: boolean;
  updateSysMonitoring: (newValue: boolean) => void;
  validation: ValidationResults;
  packageInfo?: PackageInfo;
  setHasAgentPolicyError: (hasError: boolean) => void;
  defaultAgentPolicyId?: string;
}

export const StepSelectHosts: React.FunctionComponent<Props> = ({
  agentPolicy,
  updateAgentPolicy,
  newAgentPolicy,
  updateNewAgentPolicy,
  withSysMonitoring,
  updateSysMonitoring,
  validation,
  packageInfo,
  setHasAgentPolicyError,
  defaultAgentPolicyId,
}) => {
  let agentPolicies = [];
  const { data: agentPoliciesData, error: err } = useGetAgentPolicies({
    page: 1,
    perPage: 1000,
    sortField: 'name',
    sortOrder: 'asc',
    full: true,
  });
  if (err) {
    // eslint-disable-next-line no-console
    console.debug('Could not retrieve agent policies');
  }
  agentPolicies = useMemo(
    () => agentPoliciesData?.items.filter((policy) => !policy.is_managed) || [],
    [agentPoliciesData?.items]
  );

  const tabs = [
    {
      id: 'new',
      name: 'New hosts',
      content: (
        <AgentPolicyIntegrationForm
          agentPolicy={newAgentPolicy}
          updateAgentPolicy={updateNewAgentPolicy}
          withSysMonitoring={withSysMonitoring}
          updateSysMonitoring={updateSysMonitoring}
          validation={validation}
        />
      ),
    },
    {
      id: 'existing',
      name: 'Existing hosts',
      content: (
        <StepSelectAgentPolicy
          packageInfo={packageInfo}
          defaultAgentPolicyId={defaultAgentPolicyId}
          agentPolicy={agentPolicy}
          updateAgentPolicy={updateAgentPolicy}
          setHasAgentPolicyError={setHasAgentPolicyError}
        />
      ),
    },
  ];

  return agentPolicies.length > 0 ? (
    <StyledEuiTabbedContent initialSelectedTab={tabs[0]} tabs={tabs} />
  ) : (
    <AgentPolicyIntegrationForm
      agentPolicy={newAgentPolicy}
      updateAgentPolicy={updateNewAgentPolicy}
      withSysMonitoring={withSysMonitoring}
      updateSysMonitoring={updateSysMonitoring}
      validation={validation}
    />
  );
};
