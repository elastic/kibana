/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import {
  EuiBasicTable,
  EuiButton,
  EuiEmptyPrompt,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFilterSelectItem,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPageBody,
  EuiPageContent,
  EuiPopover,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { AgentEnrollmentFlyout } from './components';
import { Agent } from '../../../types';
import { usePagination, useCore, useGetAgentConfigs, useGetAgents } from '../../../hooks';
import { ConnectedLink } from '../components';
import { SearchBar } from '../components/search_bar';
import { AgentHealth } from '../components/agent_health';
import { AgentUnenrollProvider } from '../components/agent_unenroll_provider';

export const AgentListPage: React.FunctionComponent<{}> = () => {
  const core = useCore();
  // Agent data states
  const [showInactive, setShowInactive] = useState<boolean>(false);

  // Table and search states
  const [search, setSearch] = useState('');
  const { pagination, pageSizeOptions, setPagination } = usePagination();
  const [selectedAgents, setSelectedAgents] = useState<Agent[]>([]);
  const [areAllAgentsSelected, setAreAllAgentsSelected] = useState<boolean>(false);

  // Policies state (for filtering)
  const [isPoliciesFilterOpen, setIsPoliciesFilterOpen] = useState<boolean>(false);
  const [selectedPolicies, setSelectedPolicies] = useState<string[]>([]);

  // Add a policy id to current search
  const addPolicyFilter = (policyId: string) => {
    setSelectedPolicies([...selectedPolicies, policyId]);
  };

  // Remove a policy id from current search
  const removePolicyFilter = (policyId: string) => {
    setSelectedPolicies(selectedPolicies.filter(policy => policy !== policyId));
  };

  // Agent enrollment flyout state
  const [isEnrollmentFlyoutOpen, setIsEnrollmentFlyoutOpen] = useState<boolean>(false);

  let kuery = search.trim();
  if (selectedPolicies.length) {
    if (kuery) {
      kuery = `(${kuery}) and`;
    }
    kuery = `${kuery} agents.policy_id : (${selectedPolicies
      .map(policy => `"${policy}"`)
      .join(' or ')})`;
  }

  const agentsRequest = useGetAgents(
    {
      page: pagination.currentPage,
      perPage: pagination.pageSize,
      kuery: kuery && kuery !== '' ? kuery : undefined,
      showInactive,
    },
    {
      pollIntervalMs: 5000,
    }
  );

  const agents = agentsRequest.data ? agentsRequest.data.list : [];
  const totalAgents = agentsRequest.data ? agentsRequest.data.total : 0;
  const { isLoading } = agentsRequest;

  const agentConfigsRequest = useGetAgentConfigs({
    page: 1,
    perPage: 1000,
  });

  const agentConfigs = agentConfigsRequest.data ? agentConfigsRequest.data.items : [];
  const { isLoading: isAgentConfigsLoading } = agentConfigsRequest;

  const columns = [
    {
      field: 'local_metadata.host',
      name: i18n.translate('xpack.ingestManager.agentList.hostColumnTitle', {
        defaultMessage: 'Host',
      }),
      footer: () => {
        if (selectedAgents.length === agents.length && totalAgents > selectedAgents.length) {
          return areAllAgentsSelected ? (
            <FormattedMessage
              id="xpack.ingestManager.agentList.allAgentsSelectedMessage"
              defaultMessage="All {count} agents are selected. {clearSelectionLink}"
              values={{
                count: totalAgents,
                clearSelectionLink: (
                  <EuiLink onClick={() => setAreAllAgentsSelected(false)}>
                    <FormattedMessage
                      id="xpack.ingestManager.agentList.selectPageAgentsLinkText"
                      defaultMessage="Select just this page"
                    />
                  </EuiLink>
                ),
              }}
            />
          ) : (
            <FormattedMessage
              id="xpack.ingestManager.agentList.agentsOnPageSelectedMessage"
              defaultMessage="{count, plural, one {# agent} other {# agents}} on this page are selected. {selectAllLink}"
              values={{
                count: selectedAgents.length,
                selectAllLink: (
                  <EuiLink onClick={() => setAreAllAgentsSelected(true)}>
                    <FormattedMessage
                      id="xpack.ingestManager.agentList.selectAllAgentsLinkText"
                      defaultMessage="Select all {count} agents"
                      values={{
                        count: totalAgents,
                      }}
                    />
                  </EuiLink>
                ),
              }}
            />
          );
        }
        return null;
      },
    },
    {
      field: 'policy_id',
      name: i18n.translate('xpack.ingestManager.agentList.policyColumnTitle', {
        defaultMessage: 'Agent Config',
      }),
      truncateText: true,
      render: (policyId: string) => {
        const policyName = agentConfigs.find(p => p.id === policyId)?.name;
        return policyName ? (
          <ConnectedLink color="primary" path={`/configs/${policyId}`}>
            {policyName}
          </ConnectedLink>
        ) : (
          <EuiTextColor color="subdued">{policyId}</EuiTextColor>
        );
      },
    },
    {
      field: 'active',
      name: i18n.translate('xpack.ingestManager.agentList.statusColumnTitle', {
        defaultMessage: 'Status',
      }),
      truncateText: true,
      render: (active: boolean, agent: any) => <AgentHealth agent={agent} />,
    },
    {
      name: i18n.translate('xpack.ingestManager.agentList.actionsColumnTitle', {
        defaultMessage: 'Actions',
      }),
      actions: [
        {
          render: (agent: Agent) => {
            return (
              <ConnectedLink color="primary" path={`/fleet/agents/${agent.id}`}>
                <FormattedMessage
                  id="xpack.ingestManager.agentList.viewActionLinkText"
                  defaultMessage="view"
                />
              </ConnectedLink>
            );
          },
        },
      ],
      width: '100px',
    },
  ];

  const emptyPrompt = (
    <EuiEmptyPrompt
      title={
        <h2>
          <FormattedMessage
            id="xpack.ingestManager.agentList.noAgentsPrompt"
            defaultMessage="No agents installed"
          />
        </h2>
      }
      actions={
        core.application.capabilities.ingestManager.write ? (
          <EuiButton fill iconType="plusInCircle" onClick={() => setIsEnrollmentFlyoutOpen(true)}>
            <FormattedMessage
              id="xpack.ingestManager.agentList.addButton"
              defaultMessage="Install new agent"
            />
          </EuiButton>
        ) : null
      }
    />
  );

  return (
    <EuiPageBody>
      <EuiPageContent>
        {isEnrollmentFlyoutOpen ? (
          <AgentEnrollmentFlyout
            policies={agentConfigs}
            onClose={() => setIsEnrollmentFlyoutOpen(false)}
          />
        ) : null}
        <EuiTitle size="l">
          <h1>
            <FormattedMessage
              id="xpack.ingestManager.agentList.pageTitle"
              defaultMessage="Agents"
            />
          </h1>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiFlexGroup alignItems={'center'} justifyContent={'spaceBetween'}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <EuiText color="subdued">
                <FormattedMessage
                  id="xpack.ingestManager.agentList.pageDescription"
                  defaultMessage="Use agents to faciliate data collection for your Elastic stack."
                />
              </EuiText>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSwitch
              label={i18n.translate('xpack.ingestManager.agentList.showInactiveSwitchLabel', {
                defaultMessage: 'Show inactive agents',
              })}
              checked={showInactive}
              onChange={() => setShowInactive(!showInactive)}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />

        <EuiFlexGroup alignItems={'center'}>
          {selectedAgents.length ? (
            <EuiFlexItem>
              <AgentUnenrollProvider>
                {unenrollAgentsPrompt => (
                  <EuiButton
                    color="danger"
                    onClick={() => {
                      unenrollAgentsPrompt(
                        areAllAgentsSelected ? search : selectedAgents.map(agent => agent.id),
                        areAllAgentsSelected ? totalAgents : selectedAgents.length,
                        () => {
                          // Reload agents if on first page and no search query, otherwise
                          // reset to first page and reset search, which will trigger a reload
                          if (pagination.currentPage === 1 && !search) {
                            agentsRequest.sendRequest();
                          } else {
                            setPagination({
                              ...pagination,
                              currentPage: 1,
                            });
                            setSearch('');
                          }

                          setAreAllAgentsSelected(false);
                          setSelectedAgents([]);
                        }
                      );
                    }}
                  >
                    <FormattedMessage
                      id="xpack.ingestManager.agentList.unenrollButton"
                      defaultMessage="Unenroll {count, plural, one {# agent} other {# agents}}"
                      values={{
                        count: areAllAgentsSelected ? totalAgents : selectedAgents.length,
                      }}
                    />
                  </EuiButton>
                )}
              </AgentUnenrollProvider>
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem grow={4}>
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem grow={3}>
                <SearchBar
                  value={search}
                  onChange={newSearch => {
                    setPagination({
                      ...pagination,
                      currentPage: 1,
                    });
                    setSearch(newSearch);
                  }}
                  fieldPrefix="agents"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={1}>
                <EuiFilterGroup>
                  <EuiPopover
                    ownFocus
                    button={
                      <EuiFilterButton
                        iconType="arrowDown"
                        onClick={() => setIsPoliciesFilterOpen(!isPoliciesFilterOpen)}
                        isSelected={isPoliciesFilterOpen}
                        hasActiveFilters={selectedPolicies.length > 0}
                        disabled={isAgentConfigsLoading}
                      >
                        Policies
                      </EuiFilterButton>
                    }
                    isOpen={isPoliciesFilterOpen}
                    closePopover={() => setIsPoliciesFilterOpen(false)}
                    panelPaddingSize="none"
                  >
                    <div className="euiFilterSelect__items">
                      {agentConfigs.map((policy, index) => (
                        <EuiFilterSelectItem
                          checked={selectedPolicies.includes(policy.id) ? 'on' : undefined}
                          key={index}
                          onClick={() => {
                            if (selectedPolicies.includes(policy.id)) {
                              removePolicyFilter(policy.id);
                            } else {
                              addPolicyFilter(policy.id);
                            }
                          }}
                        >
                          {policy.name}
                        </EuiFilterSelectItem>
                      ))}
                    </div>
                  </EuiPopover>
                </EuiFilterGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          {core.application.capabilities.ingestManager.write && (
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                iconType="plusInCircle"
                onClick={() => setIsEnrollmentFlyoutOpen(true)}
              >
                <FormattedMessage
                  id="xpack.ingestManager.agentList.addButton"
                  defaultMessage="Install new agent"
                />
              </EuiButton>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>

        <EuiSpacer size="m" />
        <EuiBasicTable<Agent>
          className="fleet__agentList__table"
          loading={isLoading && agentsRequest.isInitialRequest}
          noItemsMessage={
            isLoading ? (
              <FormattedMessage
                id="xpack.ingestManager.agentList.loadingAgentsMessage"
                defaultMessage="Loading agents…"
              />
            ) : !search.trim() && selectedPolicies.length === 0 && totalAgents === 0 ? (
              emptyPrompt
            ) : (
              <FormattedMessage
                id="xpack.ingestManager.agentList.noFilteredAgentsPrompt"
                defaultMessage="No agents found. {clearFiltersLink}"
                values={{
                  clearFiltersLink: (
                    <EuiLink onClick={() => setSearch('')}>
                      <FormattedMessage
                        id="xpack.ingestManager.agentList.clearFiltersLinkText"
                        defaultMessage="Clear filters"
                      />
                    </EuiLink>
                  ),
                }}
              />
            )
          }
          items={totalAgents ? agents : []}
          itemId="id"
          columns={columns}
          isSelectable={true}
          selection={{
            selectable: (agent: Agent) => agent.active,
            onSelectionChange: (newSelectedAgents: Agent[]) => {
              setSelectedAgents(newSelectedAgents);
              setAreAllAgentsSelected(false);
            },
          }}
          pagination={{
            pageIndex: pagination.currentPage - 1,
            pageSize: pagination.pageSize,
            totalItemCount: totalAgents,
            pageSizeOptions,
          }}
          onChange={({ page }: { page: { index: number; size: number } }) => {
            const newPagination = {
              ...pagination,
              currentPage: page.index + 1,
              pageSize: page.size,
            };
            setPagination(newPagination);
          }}
        />
      </EuiPageContent>
    </EuiPageBody>
  );
};
