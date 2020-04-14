/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useCallback } from 'react';
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
  EuiText,
  EuiButtonIcon,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n/react';
import { CSSProperties } from 'styled-components';
import { AgentEnrollmentFlyout } from './components';
import { Agent } from '../../../types';
import {
  usePagination,
  useCapabilities,
  useGetAgentConfigs,
  useGetAgents,
  useUrlParams,
  useLink,
} from '../../../hooks';
import { ConnectedLink } from '../components';
import { SearchBar } from '../../../components/search_bar';
import { AgentHealth } from '../components/agent_health';
import { AgentUnenrollProvider } from '../components/agent_unenroll_provider';
import { AgentStatusKueryHelper } from '../../../services';
import { FLEET_AGENT_DETAIL_PATH, AGENT_CONFIG_DETAILS_PATH } from '../../../constants';

const NO_WRAP_TRUNCATE_STYLE: CSSProperties = Object.freeze({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});
const REFRESH_INTERVAL_MS = 5000;

const statusFilters = [
  {
    status: 'online',
    label: i18n.translate('xpack.ingestManager.agentList.statusOnlineFilterText', {
      defaultMessage: 'Online',
    }),
  },
  {
    status: 'offline',
    label: i18n.translate('xpack.ingestManager.agentList.statusOfflineFilterText', {
      defaultMessage: 'Offline',
    }),
  },
  ,
  {
    status: 'error',
    label: i18n.translate('xpack.ingestManager.agentList.statusErrorFilterText', {
      defaultMessage: 'Error',
    }),
  },
] as Array<{ label: string; status: string }>;

const RowActions = React.memo<{ agent: Agent; refresh: () => void }>(({ agent, refresh }) => {
  const hasWriteCapabilites = useCapabilities().write;
  const DETAILS_URI = useLink(FLEET_AGENT_DETAIL_PATH);
  const [isOpen, setIsOpen] = useState(false);
  const handleCloseMenu = useCallback(() => setIsOpen(false), [setIsOpen]);
  const handleToggleMenu = useCallback(() => setIsOpen(!isOpen), [isOpen]);

  return (
    <EuiPopover
      anchorPosition="downRight"
      panelPaddingSize="none"
      button={
        <EuiButtonIcon
          iconType="boxesHorizontal"
          onClick={handleToggleMenu}
          aria-label={i18n.translate('xpack.ingestManager.agentList.actionsMenuText', {
            defaultMessage: 'Open',
          })}
        />
      }
      isOpen={isOpen}
      closePopover={handleCloseMenu}
    >
      <EuiContextMenuPanel
        items={[
          <EuiContextMenuItem icon="inspect" href={`${DETAILS_URI}${agent.id}`} key="viewConfig">
            <FormattedMessage
              id="xpack.ingestManager.agentList.viewActionText"
              defaultMessage="View Agent"
            />
          </EuiContextMenuItem>,

          <AgentUnenrollProvider>
            {unenrollAgentsPrompt => (
              <EuiContextMenuItem
                disabled={!hasWriteCapabilites}
                icon="cross"
                onClick={() => {
                  unenrollAgentsPrompt([agent.id], 1, () => {
                    refresh();
                  });
                }}
              >
                <FormattedMessage
                  id="xpack.ingestManager.agentList.unenrollOneButton"
                  defaultMessage="Unenroll"
                />
              </EuiContextMenuItem>
            )}
          </AgentUnenrollProvider>,
        ]}
      />
    </EuiPopover>
  );
});

export const AgentListPage: React.FunctionComponent<{}> = () => {
  const defaultKuery: string = (useUrlParams().urlParams.kuery as string) || '';
  const hasWriteCapabilites = useCapabilities().write;
  // Agent data states
  const [showInactive, setShowInactive] = useState<boolean>(false);

  // Table and search states
  const [search, setSearch] = useState(defaultKuery);
  const { pagination, pageSizeOptions, setPagination } = usePagination();
  const [selectedAgents, setSelectedAgents] = useState<Agent[]>([]);
  const [areAllAgentsSelected, setAreAllAgentsSelected] = useState<boolean>(false);

  // Configs state (for filtering)
  const [isConfigsFilterOpen, setIsConfigsFilterOpen] = useState<boolean>(false);
  const [selectedConfigs, setSelectedConfigs] = useState<string[]>([]);
  // Status for filtering
  const [isStatusFilterOpen, setIsStatutsFilterOpen] = useState<boolean>(false);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);

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

  if (selectedStatus.length) {
    if (kuery) {
      kuery = `(${kuery}) and`;
    }

    kuery = selectedStatus
      .map(status => {
        switch (status) {
          case 'online':
            return AgentStatusKueryHelper.buildKueryForOnlineAgents();
          case 'offline':
            return AgentStatusKueryHelper.buildKueryForOfflineAgents();
          case 'error':
            return AgentStatusKueryHelper.buildKueryForErrorAgents();
        }

        return '';
      })
      .join(' or ');
  }

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

  const CONFIG_DETAILS_URI = useLink(AGENT_CONFIG_DETAILS_PATH);

  const columns = [
    {
      field: 'local_metadata.host',
      name: i18n.translate('xpack.ingestManager.agentList.hostColumnTitle', {
        defaultMessage: 'Host',
      }),
      render: (host: string, agent: Agent) => (
        <ConnectedLink color="primary" path={`${FLEET_AGENT_DETAIL_PATH}${agent.id}`}>
          {host}
        </ConnectedLink>
      ),
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
      field: 'active',
      width: '100px',
      name: i18n.translate('xpack.ingestManager.agentList.statusColumnTitle', {
        defaultMessage: 'Status',
      }),
      render: (active: boolean, agent: any) => <AgentHealth agent={agent} />,
    },
    {
      field: 'config_id',
      name: i18n.translate('xpack.ingestManager.agentList.configColumnTitle', {
        defaultMessage: 'Configuration',
      }),
      render: (configId: string, agent: Agent) => {
        const configName = agentConfigs.find(p => p.id === configId)?.name;
        return (
          <EuiFlexGroup gutterSize="s" alignItems="center" style={{ minWidth: 0 }}>
            <EuiFlexItem grow={false} style={NO_WRAP_TRUNCATE_STYLE}>
              <EuiLink
                href={`${CONFIG_DETAILS_URI}${configId}`}
                style={NO_WRAP_TRUNCATE_STYLE}
                title={configName || configId}
              >
                {configName || configId}
              </EuiLink>
            </EuiFlexItem>
            {agent.config_revision && (
              <EuiFlexItem grow={false}>
                <EuiText color="default" size="xs" className="eui-textNoWrap">
                  <FormattedMessage
                    id="xpack.ingestManager.agentList.revisionNumber"
                    defaultMessage="rev. {revNumber}"
                    values={{ revNumber: agent.config_revision }}
                  />
                </EuiText>
              </EuiFlexItem>
            )}
            {agent.config_revision &&
              agent.config_newest_revision &&
              agent.config_newest_revision > agent.config_revision && (
                <EuiFlexItem grow={false}>
                  <EuiText color="subdued" size="xs" className="eui-textNoWrap">
                    <EuiIcon size="m" type="alert" color="warning" />
                    &nbsp;
                    {true && (
                      <>
                        <FormattedMessage
                          id="xpack.ingestManager.agentList.outOfDateLabel"
                          defaultMessage="Out-of-date"
                        />
                      </>
                    )}
                  </EuiText>
                </EuiFlexItem>
              )}
          </EuiFlexGroup>
        );
      },
    },
    {
      field: 'local_metadata.agent_version',
      width: '100px',
      name: i18n.translate('xpack.ingestManager.agentList.versionTitle', {
        defaultMessage: 'Version',
      }),
    },
    {
      field: 'last_checkin',
      name: i18n.translate('xpack.ingestManager.agentList.lastCheckinTitle', {
        defaultMessage: 'Last activity',
      }),
      render: (lastCheckin: string, agent: any) =>
        lastCheckin ? <FormattedRelative value={lastCheckin} /> : null,
    },
    {
      name: i18n.translate('xpack.ingestManager.agentList.actionsColumnTitle', {
        defaultMessage: 'Actions',
      }),
      actions: [
        {
          render: (agent: Agent) => {
            return <RowActions agent={agent} refresh={() => agentsRequest.sendRequest()} />;
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
            defaultMessage="No agents enrolled"
          />
        </h2>
      }
      actions={
        hasWriteCapabilites ? (
          <EuiButton fill iconType="plusInCircle" onClick={() => setIsEnrollmentFlyoutOpen(true)}>
            <FormattedMessage
              id="xpack.ingestManager.agentList.addButton"
              defaultMessage="Enroll new agent"
            />
          </EuiButton>
        ) : null
      }
    />
  );

  return (
    <>
      {isEnrollmentFlyoutOpen ? (
        <AgentEnrollmentFlyout
          agentConfigs={agentConfigs}
          onClose={() => setIsEnrollmentFlyoutOpen(false)}
        />
      ) : null}
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
            <EuiFlexItem grow={6}>
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
            <EuiFlexItem grow={2}>
              <EuiFilterGroup>
                <EuiPopover
                  ownFocus
                  button={
                    <EuiFilterButton
                      iconType="arrowDown"
                      onClick={() => setIsStatutsFilterOpen(!isStatusFilterOpen)}
                      isSelected={isStatusFilterOpen}
                      hasActiveFilters={selectedStatus.length > 0}
                      numActiveFilters={selectedStatus.length}
                      disabled={isAgentConfigsLoading}
                    >
                      <FormattedMessage
                        id="xpack.ingestManager.agentList.statusFilterText"
                        defaultMessage="Status"
                      />
                    </EuiFilterButton>
                  }
                  isOpen={isStatusFilterOpen}
                  closePopover={() => setIsStatutsFilterOpen(false)}
                  panelPaddingSize="none"
                >
                  <div className="euiFilterSelect__items">
                    {statusFilters.map(({ label, status }, idx) => (
                      <EuiFilterSelectItem
                        key={idx}
                        checked={selectedStatus.includes(status) ? 'on' : undefined}
                        onClick={() => {
                          if (selectedStatus.includes(status)) {
                            setSelectedStatus([...selectedStatus.filter(s => s !== status)]);
                          } else {
                            setSelectedStatus([...selectedStatus, status]);
                          }
                        }}
                      >
                        {label}
                      </EuiFilterSelectItem>
                    ))}
                  </div>
                </EuiPopover>
                <EuiPopover
                  ownFocus
                  button={
                    <EuiFilterButton
                      iconType="arrowDown"
                      onClick={() => setIsConfigsFilterOpen(!isConfigsFilterOpen)}
                      isSelected={isConfigsFilterOpen}
                      hasActiveFilters={selectedConfigs.length > 0}
                      numActiveFilters={selectedConfigs.length}
                      numFilters={agentConfigs.length}
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
                <EuiFilterButton
                  hasActiveFilters={showInactive}
                  onClick={() => setShowInactive(!showInactive)}
                >
                  <FormattedMessage
                    id="xpack.ingestManager.agentList.showInactiveSwitchLabel"
                    defaultMessage="Show inactive"
                  />
                </EuiFilterButton>
              </EuiFilterGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />
      <EuiBasicTable<Agent>
        className="fleet__agentList__table"
        loading={isLoading && agentsRequest.isInitialRequest}
        hasActions={true}
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
    </>
  );
};
