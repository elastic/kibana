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
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import styled from 'styled-components';

import type { Agent, AgentPolicy } from '../../../../types';
import { SearchBar } from '../../../../components';
import { AGENTS_INDEX } from '../../../../constants';

import { MAX_TAG_DISPLAY_LENGTH, truncateTag } from '../utils';

import { AgentBulkActions } from './bulk_actions';
import type { SelectionMode } from './types';
import { AgentActivityButton } from './agent_activity_button';
import { AgentStatusFilter } from './agent_status_filter';

const ClearAllTagsFilterItem = styled(EuiFilterSelectItem)`
  padding: ${(props) => props.theme.eui.euiSizeS};
`;

const FlexEndEuiFlexItem = styled(EuiFlexItem)`
  align-self: flex-end;
`;

export const SearchAndFilterBar: React.FunctionComponent<{
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
  totalAgents: number;
  totalInactiveAgents: number;
  selectionMode: SelectionMode;
  currentQuery: string;
  selectedAgents: Agent[];
  refreshAgents: (args?: { refreshTags?: boolean }) => void;
  onClickAddAgent: () => void;
  onClickAddFleetServer: () => void;
  visibleAgents: Agent[];
  onClickAgentActivity: () => void;
  showAgentActivityTour: { isOpen: boolean };
}> = ({
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
  totalAgents,
  totalInactiveAgents,
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
      {/* Search and filter bar */}
      <EuiFlexGroup direction="column">
        <FlexEndEuiFlexItem>
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem>
              <AgentActivityButton
                onClickAgentActivity={onClickAgentActivity}
                showAgentActivityTour={showAgentActivityTour}
              />
            </EuiFlexItem>
            <EuiFlexItem>
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
            <EuiFlexItem>
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
        </FlexEndEuiFlexItem>
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
                  <div className="euiFilterSelect__items">
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
                            <EuiIcon type="crossInACircleFilled" color="danger" size="s" />
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
                  <div className="euiFilterSelect__items">
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
            (selectionMode === 'query' && totalAgents > 0) ? (
              <EuiFlexItem grow={false}>
                <AgentBulkActions
                  totalAgents={totalAgents}
                  totalInactiveAgents={totalInactiveAgents}
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
