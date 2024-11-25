/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import type { EuiTabbedContentTab } from '@elastic/eui';
import { EuiTabbedContent } from '@elastic/eui';
import styled from 'styled-components';

import type { AgentPolicy, NewAgentPolicy, PackageInfo } from '../../../../../types';
import type { ValidationResults } from '../../../components/agent_policy_validation';

import { incrementPolicyName } from '../../../../../services';

import { AgentPolicyIntegrationForm } from '../../../components';

import { StepSelectAgentPolicy } from './step_select_agent_policy';
import { useAllNonManagedAgentPolicies } from './components/use_policies';

export enum SelectedPolicyTab {
  NEW = 'new',
  EXISTING = 'existing',
}

const StyledEuiTabbedContent = styled(EuiTabbedContent)`
  [role='tabpanel'] {
    padding-top: ${(props) => props.theme.eui.euiSizeM};
  }
`;

interface Props {
  agentPolicies: AgentPolicy[];
  updateAgentPolicies: (u: AgentPolicy[]) => void;
  newAgentPolicy: Partial<NewAgentPolicy>;
  updateNewAgentPolicy: (u: Partial<NewAgentPolicy>) => void;
  withSysMonitoring: boolean;
  updateSysMonitoring: (newValue: boolean) => void;
  validation: ValidationResults;
  packageInfo?: PackageInfo;
  setHasAgentPolicyError: (hasError: boolean) => void;
  updateSelectedTab: (tab: SelectedPolicyTab) => void;
  selectedAgentPolicyIds: string[];
  initialSelectedTabIndex?: number;
}

export const StepSelectHosts: React.FunctionComponent<Props> = ({
  agentPolicies,
  updateAgentPolicies,
  newAgentPolicy,
  updateNewAgentPolicy,
  withSysMonitoring,
  updateSysMonitoring,
  validation,
  packageInfo,
  setHasAgentPolicyError,
  updateSelectedTab,
  selectedAgentPolicyIds,
  initialSelectedTabIndex,
}) => {
  const existingAgentPolicies: AgentPolicy[] = useAllNonManagedAgentPolicies();

  useEffect(() => {
    if (existingAgentPolicies && existingAgentPolicies.length > 0) {
      updateNewAgentPolicy({
        ...newAgentPolicy,
        name: incrementPolicyName(existingAgentPolicies),
      });
    }
  }, [existingAgentPolicies, newAgentPolicy, updateNewAgentPolicy]);

  const tabs = [
    {
      id: SelectedPolicyTab.NEW,
      'data-test-subj': 'newHostsTab',
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
      'data-test-subj': 'existingHostsTab',
      name: 'Existing hosts',
      content: (
        <StepSelectAgentPolicy
          packageInfo={packageInfo}
          agentPolicies={agentPolicies}
          updateAgentPolicies={updateAgentPolicies}
          setHasAgentPolicyError={setHasAgentPolicyError}
          initialSelectedAgentPolicyIds={selectedAgentPolicyIds}
        />
      ),
    },
  ];

  const handleOnTabClick = (tab: EuiTabbedContentTab) =>
    updateSelectedTab(tab.id as SelectedPolicyTab);

  return (
    <StyledEuiTabbedContent
      initialSelectedTab={
        initialSelectedTabIndex
          ? tabs[initialSelectedTabIndex]
          : selectedAgentPolicyIds.length > 0
          ? tabs[1]
          : tabs[0]
      }
      tabs={tabs}
      onTabClick={handleOnTabClick}
    />
  );
};
