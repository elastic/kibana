/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import type { EuiTabbedContentTab } from '@elastic/eui';
import { EuiTabbedContent } from '@elastic/eui';
import styled from 'styled-components';

import { useGetAgentPolicies } from '../../../hooks';
import type { AgentPolicy, NewAgentPolicy, PackageInfo } from '../../../types';
import { AgentPolicyIntegrationForm } from '../components';
import type { ValidationResults } from '../components/agent_policy_validation';

import { incrementPolicyName } from '../../../services';

import { StepSelectAgentPolicy } from './step_select_agent_policy';

export enum SelectedPolicyTab {
  NEW = 'new',
  EXISTING = 'existing',
}

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
  updateSelectedTab: (tab: SelectedPolicyTab) => void;
  selectedAgentPolicyId?: string;
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
  updateSelectedTab,
  selectedAgentPolicyId,
}) => {
  let agentPolicies: AgentPolicy[] = [];
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

  useEffect(() => {
    if (agentPolicies.length > 0) {
      updateNewAgentPolicy({
        ...newAgentPolicy,
        name: incrementPolicyName(agentPolicies),
      });
    }
  }, [agentPolicies.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const tabs = [
    {
      id: SelectedPolicyTab.NEW,
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
      id: SelectedPolicyTab.EXISTING,
      name: 'Existing hosts',
      content: (
        <StepSelectAgentPolicy
          packageInfo={packageInfo}
          agentPolicy={agentPolicy}
          updateAgentPolicy={updateAgentPolicy}
          setHasAgentPolicyError={setHasAgentPolicyError}
          selectedAgentPolicyId={selectedAgentPolicyId}
        />
      ),
    },
  ];

  const handleOnTabClick = (tab: EuiTabbedContentTab) =>
    updateSelectedTab(tab.id as SelectedPolicyTab);

  return agentPolicies.length > 0 ? (
    <StyledEuiTabbedContent
      initialSelectedTab={selectedAgentPolicyId ? tabs[1] : tabs[0]}
      tabs={tabs}
      onTabClick={handleOnTabClick}
    />
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
