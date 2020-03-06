/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import styled from 'styled-components';
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
  EuiPopover,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTextColor,
  EuiTitle,
  EuiStat,
  EuiI18nNumber,
  EuiHealth,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { AgentEnrollmentFlyout } from './components';
import { WithHeaderLayout } from '../../../layouts';
import { Agent } from '../../../types';
import { usePagination, useCore, useGetAgentConfigs, useGetAgents } from '../../../hooks';
import { ConnectedLink } from '../components';
import { SearchBar } from '../components/search_bar';
import { AgentHealth } from '../components/agent_health';
import { AgentUnenrollProvider } from '../components/agent_unenroll_provider';
import { DonutChart } from './components/donut_chart';
import { useGetAgentStatus } from '../../agent_config/details_page/hooks';

const Divider = styled.div`
  width: 0;
  height: 100%;
  border-left: ${props => props.theme.eui.euiBorderThin};
  height: 45px;
`;

const REFRESH_INTERVAL_MS = 5000;

export const AgentListPage: React.FunctionComponent<{}> = () => {
  const core = useCore();
  // Agent data states
  const [showInactive, setShowInactive] = useState<boolean>(false);

  // Table and search states
  const [search, setSearch] = useState('');
  const { pagination, pageSizeOptions, setPagination } = usePagination();
  const [selectedAgents, setSelectedAgents] = useState<Agent[]>([]);
  const [areAllAgentsSelected, setAreAllAgentsSelected] = useState<boolean>(false);

  // Configs state (for filtering)
  const [isConfigsFilterOpen, setIsConfigsFilterOpen] = useState<boolean>(false);
  const [selectedConfigs, setSelectedConfigs] = useState<string[]>([]);

  // Add a config id to current search
  const addConfigFilter = (configId: string) => {
    setSelectedConfigs([...selectedConfigs, configId]);
  };

  // Remove a config id from current search
  const removeConfigFilter = (configId: string) => {
    setSelectedConfigs(selectedConfigs.filter(config => config !== configId));
  };

  // Agent enrollment flyout state
  const [isEnrollmentFlyoutOpen, setIsEnrollmentFlyoutOpen] = useState<boolean>(false);

  let kuery = search.trim();
  if (selectedConfigs.length) {
    if (kuery) {
      kuery = `(${kuery}) and`;
    }
    kuery = `${kuery} agents.config_id : (${selectedConfigs
      .map(config => `"${config}"`)
      .join(' or ')})`;
  }

  const agentStatusRequest = useGetAgentStatus(undefined, {
    pollIntervalMs: REFRESH_INTERVAL_MS,
  });
  const agentStatus = agentStatusRequest.data?.results;

  const agentsRequest = useGetAgents(
    {
      page: pagination.currentPage,
      perPage: pagination.pageSize,
      kuery: kuery && kuery !== '' ? kuery : undefined,
      showInactive,
    },
    {
      pollIntervalMs: REFRESH_INTERVAL_MS,
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
      field: 'config_id',
      name: i18n.translate('xpack.ingestManager.agentList.configColumnTitle', {
        defaultMessage: 'Agent Config',
      }),
      truncateText: true,
      render: (configId: string) => {
        const configName = agentConfigs.find(p => p.id === configId)?.name;
        return configName ? (
          <ConnectedLink color="primary" path={`/configs/${configId}`}>
            {configName}
          </ConnectedLink>
        ) : (
          <EuiTextColor color="subdued">{configId}</EuiTextColor>
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
  const headerRightColumn = (
    <EuiFlexGroup justifyContent={'flexEnd'} direction="row">
      <EuiFlexItem grow={false}>
        <EuiStat
          titleSize="xs"
          textAlign="right"
          title={<EuiI18nNumber value={agentStatus?.total ?? 0} />}
          description={i18n.translate('xpack.ingestManager.agentListStatus.totalLabel', {
            defaultMessage: 'Agents',
          })}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <DonutChart
          width={40}
          height={40}
          data={{
            online: agentStatus?.online || 0,
            offline: agentStatus?.offline || 0,
            error: agentStatus?.error || 0,
          }}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiStat
          textAlign="right"
          titleSize="xs"
          title={
            <EuiHealth color="success">
              {' '}
              <EuiI18nNumber value={agentStatus?.online ?? 0} />
            </EuiHealth>
          }
          description={i18n.translate('xpack.ingestManager.agentListStatus.onlineLabel', {
            defaultMessage: 'Online',
          })}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiStat
          textAlign="right"
          titleSize="xs"
          title={<EuiI18nNumber value={agentStatus?.offline ?? 0} />}
          description={i18n.translate('xpack.ingestManager.agentListStatus.offlineLabel', {
            defaultMessage: 'Offline',
          })}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiStat
          textAlign="right"
          titleSize="xs"
          title={<EuiI18nNumber value={agentStatus?.error ?? 0} />}
          description={i18n.translate('xpack.ingestManager.agentListStatus.errorLabel', {
            defaultMessage: 'Error',
          })}
        />
      </EuiFlexItem>
      {core.application.capabilities.ingestManager.write && (
        <>
          <EuiFlexItem grow={false}>
            <Divider />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill iconType="plusInCircle" onClick={() => setIsEnrollmentFlyoutOpen(true)}>
              <FormattedMessage
                id="xpack.ingestManager.agentList.enrollButton"
                defaultMessage="Enroll new agents"
              />
            </EuiButton>
          </EuiFlexItem>
        </>
      )}
    </EuiFlexGroup>
  );
  const headerLeftColumn = (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <EuiText>
          <h1>
            <FormattedMessage id="xpack.ingestManager.fleet.pageTitle" defaultMessage="Fleet" />
          </h1>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText color="subdued">
          <p>
            <FormattedMessage
              id="xpack.ingestManager.fleet.pageSubtitle"
              defaultMessage="Manage and deploy configuration updates to a group of agents of any size."
            />
          </p>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <WithHeaderLayout
      leftColumn={headerLeftColumn}
      rightColumn={headerRightColumn}
      tabs={[
        {
          id: 'agents',
          name: 'Agents',
          isSelected: true,
        },
        {
          id: 'enrollment_keys',
          name: 'Enrollment keys',
        },
      ]}
    >
      {isEnrollmentFlyoutOpen ? (
        <AgentEnrollmentFlyout onClose={() => setIsEnrollmentFlyoutOpen(false)} />
      ) : null}
      <EuiTitle size="l">
        <h1>
          <FormattedMessage id="xpack.ingestManager.agentList.pageTitle" defaultMessage="Agents" />
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
                      onClick={() => setIsConfigsFilterOpen(!isConfigsFilterOpen)}
                      isSelected={isConfigsFilterOpen}
                      hasActiveFilters={selectedConfigs.length > 0}
                      disabled={isAgentConfigsLoading}
                    >
                      <FormattedMessage
                        id="xpack.ingestManager.agentList.configFilterText"
                        defaultMessage="Configs"
                      />
                    </EuiFilterButton>
                  }
                  isOpen={isConfigsFilterOpen}
                  closePopover={() => setIsConfigsFilterOpen(false)}
                  panelPaddingSize="none"
                >
                  <div className="euiFilterSelect__items">
                    {agentConfigs.map((config, index) => (
                      <EuiFilterSelectItem
                        checked={selectedConfigs.includes(config.id) ? 'on' : undefined}
                        key={index}
                        onClick={() => {
                          if (selectedConfigs.includes(config.id)) {
                            removeConfigFilter(config.id);
                          } else {
                            addConfigFilter(config.id);
                          }
                        }}
                      >
                        {config.name}
                      </EuiFilterSelectItem>
                    ))}
                  </div>
                </EuiPopover>
              </EuiFilterGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
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
          ) : !search.trim() && selectedConfigs.length === 0 && totalAgents === 0 ? (
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
    </WithHeaderLayout>
  );
};
