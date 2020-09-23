/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useMemo, useCallback, useRef } from 'react';
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
  EuiContextMenuItem,
  EuiIcon,
  EuiPortal,
  EuiHorizontalRule,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n/react';
import { AgentEnrollmentFlyout } from '../components';
import { Agent, AgentPolicy } from '../../../types';
import {
  usePagination,
  useCapabilities,
  useGetAgentPolicies,
  useGetAgents,
  useUrlParams,
  useLink,
  useBreadcrumbs,
  useLicense,
} from '../../../hooks';
import { SearchBar, ContextMenuActions } from '../../../components';
import { AgentStatusKueryHelper } from '../../../services';
import { AGENT_SAVED_OBJECT_TYPE } from '../../../constants';
import {
  AgentReassignAgentPolicyFlyout,
  AgentHealth,
  AgentUnenrollAgentModal,
} from '../components';
import { AgentBulkActions, SelectionMode } from './components/bulk_actions';

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

const RowActions = React.memo<{
  agent: Agent;
  refresh: () => void;
  onReassignClick: () => void;
  onUnenrollClick: () => void;
}>(({ agent, refresh, onReassignClick, onUnenrollClick }) => {
  const { getHref } = useLink();
  const hasWriteCapabilites = useCapabilities().write;

  const isUnenrolling = agent.status === 'unenrolling';
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  return (
    <ContextMenuActions
      isOpen={isMenuOpen}
      onChange={(isOpen) => setIsMenuOpen(isOpen)}
      items={[
        <EuiContextMenuItem
          icon="inspect"
          href={getHref('fleet_agent_details', { agentId: agent.id })}
          key="viewAgent"
        >
          <FormattedMessage
            id="xpack.ingestManager.agentList.viewActionText"
            defaultMessage="View agent"
          />
        </EuiContextMenuItem>,
        <EuiContextMenuItem
          icon="pencil"
          onClick={() => {
            onReassignClick();
          }}
          disabled={!agent.active}
          key="reassignPolicy"
        >
          <FormattedMessage
            id="xpack.ingestManager.agentList.reassignActionText"
            defaultMessage="Assign to new policy"
          />
        </EuiContextMenuItem>,
        <EuiContextMenuItem
          disabled={!hasWriteCapabilites || !agent.active}
          icon="trash"
          onClick={() => {
            onUnenrollClick();
          }}
        >
          {isUnenrolling ? (
            <FormattedMessage
              id="xpack.ingestManager.agentList.forceUnenrollOneButton"
              defaultMessage="Force unenroll"
            />
          ) : (
            <FormattedMessage
              id="xpack.ingestManager.agentList.unenrollOneButton"
              defaultMessage="Unenroll agent"
            />
          )}
        </EuiContextMenuItem>,
      ]}
    />
  );
});

function safeMetadata(val: any) {
  if (typeof val !== 'string') {
    return '-';
  }
  return val;
}

export const AgentListPage: React.FunctionComponent<{}> = () => {
  useBreadcrumbs('fleet_agent_list');
  const { getHref } = useLink();
  const defaultKuery: string = (useUrlParams().urlParams.kuery as string) || '';
  const hasWriteCapabilites = useCapabilities().write;
  const isGoldPlus = useLicense().isGoldPlus();

  // Agent data states
  const [showInactive, setShowInactive] = useState<boolean>(false);

  // Table and search states
  const [search, setSearch] = useState<string>(defaultKuery);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('manual');
  const [selectedAgents, setSelectedAgents] = useState<Agent[]>([]);
  const tableRef = useRef<EuiBasicTable<Agent>>(null);
  const { pagination, pageSizeOptions, setPagination } = usePagination();

  // Policies state for filtering
  const [isAgentPoliciesFilterOpen, setIsAgentPoliciesFilterOpen] = useState<boolean>(false);
  const [selectedAgentPolicies, setSelectedAgentPolicies] = useState<string[]>([]);

  // Status for filtering
  const [isStatusFilterOpen, setIsStatutsFilterOpen] = useState<boolean>(false);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);

  const clearFilters = useCallback(() => {
    setSearch('');
    setSelectedAgentPolicies([]);
    setSelectedStatus([]);
  }, [setSearch, setSelectedAgentPolicies, setSelectedStatus]);

  // Add a agent policy id to current search
  const addAgentPolicyFilter = (policyId: string) => {
    setSelectedAgentPolicies([...selectedAgentPolicies, policyId]);
  };

  // Remove a agent policy id from current search
  const removeAgentPolicyFilter = (policyId: string) => {
    setSelectedAgentPolicies(
      selectedAgentPolicies.filter((agentPolicy) => agentPolicy !== policyId)
    );
  };

  // Agent enrollment flyout state
  const [isEnrollmentFlyoutOpen, setIsEnrollmentFlyoutOpen] = useState<boolean>(false);

  // Agent actions states
  const [agentToReassign, setAgentToReassign] = useState<Agent | undefined>(undefined);
  const [agentToUnenroll, setAgentToUnenroll] = useState<Agent | undefined>(undefined);

  let kuery = search.trim();
  if (selectedAgentPolicies.length) {
    if (kuery) {
      kuery = `(${kuery}) and`;
    }
    kuery = `${kuery} ${AGENT_SAVED_OBJECT_TYPE}.policy_id : (${selectedAgentPolicies
      .map((agentPolicy) => `"${agentPolicy}"`)
      .join(' or ')})`;
  }

  if (selectedStatus.length) {
    const kueryStatus = selectedStatus
      .map((status) => {
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

    if (kuery) {
      kuery = `(${kuery}) and ${kueryStatus}`;
    } else {
      kuery = kueryStatus;
    }
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
  const totalInactiveAgents = agentsRequest.data ? agentsRequest.data.totalInactive : 0;
  const { isLoading } = agentsRequest;

  const agentPoliciesRequest = useGetAgentPolicies({
    page: 1,
    perPage: 1000,
  });

  const agentPolicies = agentPoliciesRequest.data ? agentPoliciesRequest.data.items : [];
  const agentPoliciesIndexedById = useMemo(() => {
    return agentPolicies.reduce((acc, agentPolicy) => {
      acc[agentPolicy.id] = agentPolicy;

      return acc;
    }, {} as { [k: string]: AgentPolicy });
  }, [agentPolicies]);
  const { isLoading: isAgentPoliciesLoading } = agentPoliciesRequest;

  const columns = [
    {
      field: 'local_metadata.host.hostname',
      name: i18n.translate('xpack.ingestManager.agentList.hostColumnTitle', {
        defaultMessage: 'Host',
      }),
      render: (host: string, agent: Agent) => (
        <EuiLink href={getHref('fleet_agent_details', { agentId: agent.id })}>
          {safeMetadata(host)}
        </EuiLink>
      ),
    },
    {
      field: 'active',
      width: '120px',
      name: i18n.translate('xpack.ingestManager.agentList.statusColumnTitle', {
        defaultMessage: 'Status',
      }),
      render: (active: boolean, agent: any) => <AgentHealth agent={agent} />,
    },
    {
      field: 'policy_id',
      name: i18n.translate('xpack.ingestManager.agentList.policyColumnTitle', {
        defaultMessage: 'Agent policy',
      }),
      render: (policyId: string, agent: Agent) => {
        const policyName = agentPolicies.find((p) => p.id === policyId)?.name;
        return (
          <EuiFlexGroup gutterSize="s" alignItems="center" style={{ minWidth: 0 }}>
            <EuiFlexItem grow={false} className="eui-textTruncate">
              <EuiLink
                href={getHref('policy_details', { policyId })}
                className="eui-textTruncate"
                title={policyName || policyId}
              >
                {policyName || policyId}
              </EuiLink>
            </EuiFlexItem>
            {agent.policy_revision && (
              <EuiFlexItem grow={false}>
                <EuiText color="default" size="xs" className="eui-textNoWrap">
                  <FormattedMessage
                    id="xpack.ingestManager.agentList.revisionNumber"
                    defaultMessage="rev. {revNumber}"
                    values={{ revNumber: agent.policy_revision }}
                  />
                </EuiText>
              </EuiFlexItem>
            )}
            {agent.policy_id &&
              agent.policy_revision &&
              agentPoliciesIndexedById[agent.policy_id] &&
              agentPoliciesIndexedById[agent.policy_id].revision > agent.policy_revision && (
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
      field: 'local_metadata.elastic.agent.version',
      width: '100px',
      name: i18n.translate('xpack.ingestManager.agentList.versionTitle', {
        defaultMessage: 'Version',
      }),
      render: (version: string, agent: Agent) => safeMetadata(version),
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
            return (
              <RowActions
                agent={agent}
                refresh={() => agentsRequest.resendRequest()}
                onReassignClick={() => setAgentToReassign(agent)}
                onUnenrollClick={() => setAgentToUnenroll(agent)}
              />
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
            defaultMessage="No agents enrolled"
          />
        </h2>
      }
      actions={
        hasWriteCapabilites ? (
          <EuiButton fill iconType="plusInCircle" onClick={() => setIsEnrollmentFlyoutOpen(true)}>
            <FormattedMessage
              id="xpack.ingestManager.agentList.addButton"
              defaultMessage="Add agent"
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
          agentPolicies={agentPolicies}
          onClose={() => setIsEnrollmentFlyoutOpen(false)}
        />
      ) : null}
      {agentToReassign && (
        <EuiPortal>
          <AgentReassignAgentPolicyFlyout
            agents={[agentToReassign]}
            onClose={() => {
              setAgentToReassign(undefined);
              agentsRequest.resendRequest();
            }}
          />
        </EuiPortal>
      )}
      {agentToUnenroll && (
        <EuiPortal>
          <AgentUnenrollAgentModal
            agents={[agentToUnenroll]}
            agentCount={1}
            onClose={() => {
              setAgentToUnenroll(undefined);
              agentsRequest.resendRequest();
            }}
            useForceUnenroll={agentToUnenroll.status === 'unenrolling'}
          />
        </EuiPortal>
      )}

      {/* Search and filter bar */}
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={4}>
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem grow={6}>
              <SearchBar
                value={search}
                onChange={(newSearch) => {
                  setPagination({
                    ...pagination,
                    currentPage: 1,
                  });
                  setSearch(newSearch);
                }}
                fieldPrefix={AGENT_SAVED_OBJECT_TYPE}
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
                      disabled={isAgentPoliciesLoading}
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
                            setSelectedStatus([...selectedStatus.filter((s) => s !== status)]);
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
                      onClick={() => setIsAgentPoliciesFilterOpen(!isAgentPoliciesFilterOpen)}
                      isSelected={isAgentPoliciesFilterOpen}
                      hasActiveFilters={selectedAgentPolicies.length > 0}
                      numActiveFilters={selectedAgentPolicies.length}
                      numFilters={agentPolicies.length}
                      disabled={isAgentPoliciesLoading}
                    >
                      <FormattedMessage
                        id="xpack.ingestManager.agentList.policyFilterText"
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

      {/* Agent total and bulk actions */}
      <AgentBulkActions
        totalAgents={totalAgents}
        totalInactiveAgents={totalInactiveAgents}
        selectableAgents={agents?.filter((agent) => agent.active).length || 0}
        selectionMode={selectionMode}
        setSelectionMode={setSelectionMode}
        currentQuery={kuery}
        selectedAgents={selectedAgents}
        setSelectedAgents={(newAgents: Agent[]) => {
          if (tableRef?.current) {
            tableRef.current.setSelection(newAgents);
            setSelectionMode('manual');
          }
        }}
        refreshAgents={() => agentsRequest.resendRequest()}
      />
      <EuiSpacer size="xs" />
      <EuiHorizontalRule margin="none" />

      {/* Agent list table */}
      <EuiBasicTable<Agent>
        ref={tableRef}
        className="fleet__agentList__table"
        data-test-subj="fleetAgentListTable"
        loading={isLoading}
        hasActions={true}
        noItemsMessage={
          isLoading && agentsRequest.isInitialRequest ? (
            <FormattedMessage
              id="xpack.ingestManager.agentList.loadingAgentsMessage"
              defaultMessage="Loading agents…"
            />
          ) : search.trim() || selectedAgentPolicies.length || selectedStatus.length ? (
            <FormattedMessage
              id="xpack.ingestManager.agentList.noFilteredAgentsPrompt"
              defaultMessage="No agents found. {clearFiltersLink}"
              values={{
                clearFiltersLink: (
                  <EuiLink onClick={() => clearFilters()}>
                    <FormattedMessage
                      id="xpack.ingestManager.agentList.clearFiltersLinkText"
                      defaultMessage="Clear filters"
                    />
                  </EuiLink>
                ),
              }}
            />
          ) : (
            emptyPrompt
          )
        }
        items={totalAgents ? agents : []}
        itemId="id"
        columns={columns}
        pagination={{
          pageIndex: pagination.currentPage - 1,
          pageSize: pagination.pageSize,
          totalItemCount: totalAgents,
          pageSizeOptions,
        }}
        isSelectable={true}
        selection={
          isGoldPlus
            ? {
                onSelectionChange: (newAgents: Agent[]) => {
                  setSelectedAgents(newAgents);
                  setSelectionMode('manual');
                },
                selectable: (agent: Agent) => agent.active,
              }
            : undefined
        }
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
