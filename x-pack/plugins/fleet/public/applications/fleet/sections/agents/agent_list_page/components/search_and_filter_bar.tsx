/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { useIsFirstTimeAgentUserQuery } from '../../../../../integrations/sections/epm/screens/detail/hooks';

import type { Agent, AgentPolicy } from '../../../../types';
import { SearchBar } from '../../../../components';
import { AGENTS_INDEX, AGENTS_PREFIX } from '../../../../constants';

import { useAuthz, useStartServices } from '../../../../hooks';

import { AgentBulkActions } from './bulk_actions';
import type { SelectionMode } from './types';
import { AgentActivityButton } from './agent_activity_button';
import { AgentStatusFilter } from './agent_status_filter';
import { DashboardsButtons } from './dashboards_buttons';
import { AgentPolicyFilter } from './filter_bar/agent_policy_filter';
import { TagsFilter } from './filter_bar/tags_filter';
import { AgentActivityBadge } from './agent_activity_badge';

export interface SearchAndFilterBarProps {
  agentPolicies: AgentPolicy[];
  draftKuery: string;
  onDraftKueryChange: (kuery: string) => void;
  onSubmitSearch: (kuery: string) => void;
  selectedAgentPolicies: string[];
  onSelectedAgentPoliciesChange: (selectedPolicies: string[]) => void;
  selectedStatus: string[];
  onSelectedStatusChange: (selectedStatus: string[]) => void;
  showUpgradeable: boolean;
  onShowUpgradeableChange: (showUpgradeable: boolean) => void;
  tags: string[];
  selectedTags: string[];
  onSelectedTagsChange: (selectedTags: string[]) => void;
  nAgentsInTable: number;
  totalInactiveAgents: number;
  totalManagedAgentIds: string[];
  selectionMode: SelectionMode;
  currentQuery: string;
  selectedAgents: Agent[];
  refreshAgents: (args?: { refreshTags?: boolean }) => void;
  onClickAddAgent: () => void;
  onClickAddFleetServer: () => void;
  agentsOnCurrentPage: Agent[];
  onClickAgentActivity: () => void;
  showAgentActivityTour: { isOpen: boolean };
  latestAgentActionErrors: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

export const SearchAndFilterBar: React.FunctionComponent<SearchAndFilterBarProps> = ({
  agentPolicies,
  draftKuery,
  onDraftKueryChange,
  onSubmitSearch,
  selectedAgentPolicies,
  onSelectedAgentPoliciesChange,
  selectedStatus,
  onSelectedStatusChange,
  showUpgradeable,
  onShowUpgradeableChange,
  tags,
  selectedTags,
  onSelectedTagsChange,
  nAgentsInTable,
  totalInactiveAgents,
  totalManagedAgentIds,
  selectionMode,
  currentQuery,
  selectedAgents,
  refreshAgents,
  onClickAddAgent,
  onClickAddFleetServer,
  agentsOnCurrentPage,
  onClickAgentActivity,
  showAgentActivityTour,
  latestAgentActionErrors,
  sortField,
  sortOrder,
}) => {
  const authz = useAuthz();

  const { isFirstTimeAgentUser, isLoading: isFirstTimeAgentUserLoading } =
    useIsFirstTimeAgentUserQuery();
  const { cloud } = useStartServices();

  return (
    <>
      <EuiFlexGroup direction="column">
        {/* Top Buttons and Links */}
        <EuiFlexGroup>
          <EuiFlexItem>
            {!isFirstTimeAgentUserLoading && !isFirstTimeAgentUser && <DashboardsButtons />}
          </EuiFlexItem>
          <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <AgentActivityBadge
                recentErrors={latestAgentActionErrors}
                onClick={onClickAgentActivity}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <AgentActivityButton
                onClickAgentActivity={onClickAgentActivity}
                showAgentActivityTour={showAgentActivityTour}
              />
            </EuiFlexItem>
            {authz.fleet.addFleetServers && !cloud?.isServerlessEnabled ? (
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  content={
                    <FormattedMessage
                      id="xpack.fleet.agentList.addFleetServerButton.tooltip"
                      defaultMessage="Fleet Server is a component of the Elastic Stack used to centrally manage Elastic Agents"
                    />
                  }
                >
                  <EuiButton onClick={onClickAddFleetServer} data-test-subj="addFleetServerButton">
                    <FormattedMessage
                      id="xpack.fleet.agentList.addFleetServerButton"
                      defaultMessage="Add Fleet Server"
                    />
                  </EuiButton>
                </EuiToolTip>
              </EuiFlexItem>
            ) : null}
            {authz.fleet.addAgents ? (
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  content={
                    <FormattedMessage
                      id="xpack.fleet.agentList.addAgentButton.tooltip"
                      defaultMessage="Add Elastic Agents to your hosts to collect data and send it to the Elastic Stack"
                    />
                  }
                >
                  <EuiButton fill onClick={onClickAddAgent} data-test-subj="addAgentButton">
                    <FormattedMessage
                      id="xpack.fleet.agentList.addButton"
                      defaultMessage="Add agent"
                    />
                  </EuiButton>
                </EuiToolTip>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiFlexGroup>
        {/* Search and filters */}
        <EuiFlexItem grow={4}>
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem grow={6}>
              <SearchBar
                value={draftKuery}
                fieldPrefix={AGENTS_PREFIX}
                indexPattern={AGENTS_INDEX}
                onChange={(newSearch, submit) => {
                  onDraftKueryChange(newSearch);
                  if (submit) {
                    onSubmitSearch(newSearch);
                  }
                }}
                dataTestSubj="agentList.queryInput"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={2}>
              <EuiFilterGroup>
                <AgentStatusFilter
                  selectedStatus={selectedStatus}
                  onSelectedStatusChange={onSelectedStatusChange}
                  totalInactiveAgents={totalInactiveAgents}
                  disabled={agentPolicies.length === 0}
                />
                <TagsFilter
                  tags={tags}
                  selectedTags={selectedTags}
                  onSelectedTagsChange={onSelectedTagsChange}
                />
                <AgentPolicyFilter
                  selectedAgentPolicies={selectedAgentPolicies}
                  onSelectedAgentPoliciesChange={onSelectedAgentPoliciesChange}
                  agentPolicies={agentPolicies}
                />
                <EuiFilterButton
                  hasActiveFilters={showUpgradeable}
                  onClick={() => {
                    onShowUpgradeableChange(!showUpgradeable);
                  }}
                  data-test-subj="agentList.showUpgradeable"
                >
                  <FormattedMessage
                    id="xpack.fleet.agentList.showUpgradeableFilterLabel"
                    defaultMessage="Upgrade available"
                  />
                </EuiFilterButton>
              </EuiFilterGroup>
            </EuiFlexItem>
            {(authz.fleet.allAgents && selectionMode === 'manual' && selectedAgents.length) ||
            (authz.fleet.allAgents && selectionMode === 'query' && nAgentsInTable > 0) ? (
              <EuiFlexItem grow={false}>
                <AgentBulkActions
                  nAgentsInTable={nAgentsInTable}
                  totalManagedAgentIds={totalManagedAgentIds}
                  selectionMode={selectionMode}
                  currentQuery={currentQuery}
                  selectedAgents={selectedAgents}
                  agentsOnCurrentPage={agentsOnCurrentPage}
                  refreshAgents={refreshAgents}
                  allTags={tags}
                  agentPolicies={agentPolicies}
                  sortField={sortField}
                  sortOrder={sortOrder}
                />
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
