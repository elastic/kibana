/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFilterSelectItem,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPopover,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import styled from 'styled-components';

import { useIsFirstTimeAgentUserQuery } from '../../../../../integrations/sections/epm/screens/detail/hooks';

import type { Agent, AgentPolicy } from '../../../../types';
import { SearchBar } from '../../../../components';
import { AGENTS_INDEX, AGENTS_PREFIX } from '../../../../constants';
import { useFleetServerStandalone } from '../../../../hooks';

import { MAX_TAG_DISPLAY_LENGTH, truncateTag } from '../utils';

import { AgentBulkActions } from './bulk_actions';
import type { SelectionMode } from './types';
import { AgentActivityButton } from './agent_activity_button';
import { AgentStatusFilter } from './agent_status_filter';
import { DashboardsButtons } from './dashboards_buttons';

const ClearAllTagsFilterItem = styled(EuiFilterSelectItem)`
  padding: ${(props) => props.theme.eui.euiSizeS};
`;

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
  shownAgents: number;
  inactiveShownAgents: number;
  totalInactiveAgents: number;
  totalManagedAgentIds: string[];
  selectionMode: SelectionMode;
  currentQuery: string;
  selectedAgents: Agent[];
  refreshAgents: (args?: { refreshTags?: boolean }) => void;
  onClickAddAgent: () => void;
  onClickAddFleetServer: () => void;
  visibleAgents: Agent[];
  onClickAgentActivity: () => void;
  showAgentActivityTour: { isOpen: boolean };
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
  shownAgents,
  inactiveShownAgents,
  totalInactiveAgents,
  totalManagedAgentIds,
  selectionMode,
  currentQuery,
  selectedAgents,
  refreshAgents,
  onClickAddAgent,
  onClickAddFleetServer,
  visibleAgents,
  onClickAgentActivity,
  showAgentActivityTour,
}) => {
  const { euiTheme } = useEuiTheme();
  const { isFleetServerStandalone } = useFleetServerStandalone();
  const { isFirstTimeAgentUser, isLoading: isFirstTimeAgentUserLoading } =
    useIsFirstTimeAgentUserQuery();
  const showAddFleetServerBtn = !isFleetServerStandalone;

  // Policies state for filtering
  const [isAgentPoliciesFilterOpen, setIsAgentPoliciesFilterOpen] = useState<boolean>(false);

  const [isTagsFilterOpen, setIsTagsFilterOpen] = useState<boolean>(false);

  // Add a agent policy id to current search
  const addAgentPolicyFilter = (policyId: string) => {
    onSelectedAgentPoliciesChange([...selectedAgentPolicies, policyId]);
  };

  // Remove a agent policy id from current search
  const removeAgentPolicyFilter = (policyId: string) => {
    onSelectedAgentPoliciesChange(
      selectedAgentPolicies.filter((agentPolicy) => agentPolicy !== policyId)
    );
  };

  const addTagsFilter = (tag: string) => {
    onSelectedTagsChange([...selectedTags, tag]);
  };

  const removeTagsFilter = (tag: string) => {
    onSelectedTagsChange(selectedTags.filter((t) => t !== tag));
  };

  return (
    <>
      <EuiFlexGroup direction="column">
        {/* Top Buttons and Links */}
        <EuiFlexGroup>
          <EuiFlexItem>
            {!isFirstTimeAgentUserLoading && !isFirstTimeAgentUser && <DashboardsButtons />}
          </EuiFlexItem>
          <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <AgentActivityButton
                onClickAgentActivity={onClickAgentActivity}
                showAgentActivityTour={showAgentActivityTour}
              />
            </EuiFlexItem>
            {showAddFleetServerBtn && (
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
            )}
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
          </EuiFlexGroup>
        </EuiFlexGroup>
        {/* Search and filters */}
        <EuiFlexItem grow={4}>
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem grow={6}>
              <SearchBar
                value={draftKuery}
                onChange={(newSearch, submit) => {
                  onDraftKueryChange(newSearch);
                  if (submit) {
                    onSubmitSearch(newSearch);
                  }
                }}
                fieldPrefix={AGENTS_PREFIX}
                indexPattern={AGENTS_INDEX}
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
                <EuiPopover
                  ownFocus
                  button={
                    <EuiFilterButton
                      iconType="arrowDown"
                      onClick={() => setIsTagsFilterOpen(!isTagsFilterOpen)}
                      isSelected={isTagsFilterOpen}
                      hasActiveFilters={selectedTags.length > 0}
                      numActiveFilters={selectedTags.length}
                      numFilters={tags.length}
                      disabled={tags.length === 0}
                      data-test-subj="agentList.tagsFilter"
                    >
                      <FormattedMessage
                        id="xpack.fleet.agentList.tagsFilterText"
                        defaultMessage="Tags"
                      />
                    </EuiFilterButton>
                  }
                  isOpen={isTagsFilterOpen}
                  closePopover={() => setIsTagsFilterOpen(false)}
                  panelPaddingSize="none"
                >
                  {/* EUI NOTE: Please use EuiSelectable (which already has height/scrolling built in)
                      instead of EuiFilterSelectItem (which is pending deprecation).
                      @see https://elastic.github.io/eui/#/forms/filter-group#multi-select */}
                  <div className="eui-yScroll" css={{ maxHeight: euiTheme.base * 30 }}>
                    <>
                      {tags.map((tag, index) => (
                        <EuiFilterSelectItem
                          checked={selectedTags.includes(tag) ? 'on' : undefined}
                          key={index}
                          onClick={() => {
                            if (selectedTags.includes(tag)) {
                              removeTagsFilter(tag);
                            } else {
                              addTagsFilter(tag);
                            }
                          }}
                        >
                          {tag.length > MAX_TAG_DISPLAY_LENGTH ? (
                            <EuiToolTip content={tag}>
                              <span>{truncateTag(tag)}</span>
                            </EuiToolTip>
                          ) : (
                            tag
                          )}
                        </EuiFilterSelectItem>
                      ))}

                      <EuiHorizontalRule margin="none" />

                      <ClearAllTagsFilterItem
                        showIcons={false}
                        onClick={() => {
                          onSelectedTagsChange([]);
                        }}
                      >
                        <EuiFlexGroup alignItems="center" justifyContent="center" gutterSize="s">
                          <EuiFlexItem grow={false}>
                            <EuiIcon type="error" color="danger" size="s" />
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>Clear all</EuiFlexItem>
                        </EuiFlexGroup>
                      </ClearAllTagsFilterItem>
                    </>
                  </div>
                </EuiPopover>
                <EuiPopover
                  ownFocus
                  button={
                    <EuiFilterButton
                      iconType="arrowDown"
                      onClick={() => setIsAgentPoliciesFilterOpen(!isAgentPoliciesFilterOpen)}
                      isSelected={isAgentPoliciesFilterOpen}
                      hasActiveFilters={selectedAgentPolicies.length > 0}
                      numActiveFilters={selectedAgentPolicies.length}
                      numFilters={agentPolicies.length}
                      disabled={agentPolicies.length === 0}
                      data-test-subj="agentList.policyFilter"
                    >
                      <FormattedMessage
                        id="xpack.fleet.agentList.policyFilterText"
                        defaultMessage="Agent policy"
                      />
                    </EuiFilterButton>
                  }
                  isOpen={isAgentPoliciesFilterOpen}
                  closePopover={() => setIsAgentPoliciesFilterOpen(false)}
                  panelPaddingSize="none"
                >
                  {/* EUI NOTE: Please use EuiSelectable (which already has height/scrolling built in)
                      instead of EuiFilterSelectItem (which is pending deprecation).
                      @see https://elastic.github.io/eui/#/forms/filter-group#multi-select */}
                  <div className="eui-yScroll" css={{ maxHeight: euiTheme.base * 30 }}>
                    {agentPolicies.map((agentPolicy, index) => (
                      <EuiFilterSelectItem
                        checked={selectedAgentPolicies.includes(agentPolicy.id) ? 'on' : undefined}
                        key={index}
                        onClick={() => {
                          if (selectedAgentPolicies.includes(agentPolicy.id)) {
                            removeAgentPolicyFilter(agentPolicy.id);
                          } else {
                            addAgentPolicyFilter(agentPolicy.id);
                          }
                        }}
                      >
                        {agentPolicy.name}
                      </EuiFilterSelectItem>
                    ))}
                  </div>
                </EuiPopover>
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
            {(selectionMode === 'manual' && selectedAgents.length) ||
            (selectionMode === 'query' && shownAgents > 0) ? (
              <EuiFlexItem grow={false}>
                <AgentBulkActions
                  shownAgents={shownAgents}
                  inactiveShownAgents={inactiveShownAgents}
                  totalManagedAgentIds={totalManagedAgentIds}
                  selectionMode={selectionMode}
                  currentQuery={currentQuery}
                  selectedAgents={selectedAgents}
                  visibleAgents={visibleAgents}
                  refreshAgents={refreshAgents}
                  allTags={tags}
                  agentPolicies={agentPolicies}
                />
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
