/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useCallback, useRef, useEffect, useContext } from 'react';
import {
  EuiBasicTable,
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiContextMenuItem,
  EuiIcon,
  EuiPortal,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n-react';

import type { Agent, AgentPolicy, PackagePolicy, SimplifiedAgentStatus } from '../../../types';
import {
  usePagination,
  useAuthz,
  useGetAgentPolicies,
  sendGetAgents,
  sendGetAgentStatus,
  useUrlParams,
  useLink,
  useBreadcrumbs,
  useLicense,
  useKibanaVersion,
  useStartServices,
} from '../../../hooks';
import {
  AgentEnrollmentFlyout,
  AgentPolicySummaryLine,
  ContextMenuActions,
} from '../../../components';
import { AgentStatusKueryHelper, isAgentUpgradeable } from '../../../services';
import { AGENTS_PREFIX, FLEET_SERVER_PACKAGE } from '../../../constants';
import {
  AgentReassignAgentPolicyModal,
  AgentHealth,
  AgentUnenrollAgentModal,
  AgentUpgradeAgentModal,
  FleetServerCloudUnhealthyCallout,
  FleetServerOnPremUnhealthyCallout,
} from '../components';
import { useFleetServerUnhealthy } from '../hooks/use_fleet_server_unhealthy';

import { agentFlyoutContext } from '..';

import { AgentTableHeader } from './components/table_header';
import type { SelectionMode } from './components/bulk_actions';
import { SearchAndFilterBar } from './components/search_and_filter_bar';

const REFRESH_INTERVAL_MS = 30000;

const RowActions = React.memo<{
  agent: Agent;
  agentPolicy?: AgentPolicy;
  refresh: () => void;
  onReassignClick: () => void;
  onUnenrollClick: () => void;
  onUpgradeClick: () => void;
}>(({ agent, agentPolicy, refresh, onReassignClick, onUnenrollClick, onUpgradeClick }) => {
  const { getHref } = useLink();
  const hasFleetAllPrivileges = useAuthz().fleet.all;

  const isUnenrolling = agent.status === 'unenrolling';
  const kibanaVersion = useKibanaVersion();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuItems = [
    <EuiContextMenuItem
      icon="inspect"
      href={getHref('agent_details', { agentId: agent.id })}
      key="viewAgent"
    >
      <FormattedMessage id="xpack.fleet.agentList.viewActionText" defaultMessage="View agent" />
    </EuiContextMenuItem>,
  ];

  if (agentPolicy?.is_managed === false) {
    menuItems.push(
      <EuiContextMenuItem
        icon="pencil"
        onClick={() => {
          onReassignClick();
        }}
        disabled={!agent.active}
        key="reassignPolicy"
      >
        <FormattedMessage
          id="xpack.fleet.agentList.reassignActionText"
          defaultMessage="Assign to new policy"
        />
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        disabled={!hasFleetAllPrivileges || !agent.active}
        icon="trash"
        onClick={() => {
          onUnenrollClick();
        }}
      >
        {isUnenrolling ? (
          <FormattedMessage
            id="xpack.fleet.agentList.forceUnenrollOneButton"
            defaultMessage="Force unenroll"
          />
        ) : (
          <FormattedMessage
            id="xpack.fleet.agentList.unenrollOneButton"
            defaultMessage="Unenroll agent"
          />
        )}
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        icon="refresh"
        disabled={!isAgentUpgradeable(agent, kibanaVersion)}
        onClick={() => {
          onUpgradeClick();
        }}
      >
        <FormattedMessage
          id="xpack.fleet.agentList.upgradeOneButton"
          defaultMessage="Upgrade agent"
        />
      </EuiContextMenuItem>
    );
  }
  return (
    <ContextMenuActions
      isOpen={isMenuOpen}
      onChange={(isOpen) => setIsMenuOpen(isOpen)}
      items={menuItems}
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
  const { notifications, cloud } = useStartServices();
  useBreadcrumbs('agent_list');
  const { getHref } = useLink();
  const defaultKuery: string = (useUrlParams().urlParams.kuery as string) || '';
  const hasFleetAllPrivileges = useAuthz().fleet.all;
  const isGoldPlus = useLicense().isGoldPlus();
  const kibanaVersion = useKibanaVersion();

  // Agent data states
  const [showUpgradeable, setShowUpgradeable] = useState<boolean>(false);

  // Table and search states
  const [draftKuery, setDraftKuery] = useState<string>(defaultKuery);
  const [search, setSearch] = useState<string>(defaultKuery);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('manual');
  const [selectedAgents, setSelectedAgents] = useState<Agent[]>([]);
  const tableRef = useRef<EuiBasicTable<Agent>>(null);
  const { pagination, pageSizeOptions, setPagination } = usePagination();

  const onSubmitSearch = useCallback(
    (newKuery: string) => {
      setSearch(newKuery);
      setPagination({
        ...pagination,
        currentPage: 1,
      });
    },
    [setSearch, pagination, setPagination]
  );

  // Policies state for filtering
  const [selectedAgentPolicies, setSelectedAgentPolicies] = useState<string[]>([]);

  // Status for filtering
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);

  const isUsingFilter =
    search.trim() || selectedAgentPolicies.length || selectedStatus.length || showUpgradeable;

  const clearFilters = useCallback(() => {
    setDraftKuery('');
    setSearch('');
    setSelectedAgentPolicies([]);
    setSelectedStatus([]);
    setShowUpgradeable(false);
  }, [setSearch, setDraftKuery, setSelectedAgentPolicies, setSelectedStatus, setShowUpgradeable]);

  // Agent enrollment flyout state
  const [enrollmentFlyout, setEnrollmentFlyoutState] = useState<{
    isOpen: boolean;
    selectedPolicyId?: string;
  }>({
    isOpen: false,
  });

  const flyoutContext = useContext(agentFlyoutContext);

  // Agent actions states
  const [agentToReassign, setAgentToReassign] = useState<Agent | undefined>(undefined);
  const [agentToUnenroll, setAgentToUnenroll] = useState<Agent | undefined>(undefined);
  const [agentToUpgrade, setAgentToUpgrade] = useState<Agent | undefined>(undefined);

  // Kuery
  const kuery = useMemo(() => {
    let kueryBuilder = search.trim();
    if (selectedAgentPolicies.length) {
      if (kueryBuilder) {
        kueryBuilder = `(${kueryBuilder}) and`;
      }
      kueryBuilder = `${kueryBuilder} ${AGENTS_PREFIX}.policy_id : (${selectedAgentPolicies
        .map((agentPolicy) => `"${agentPolicy}"`)
        .join(' or ')})`;
    }
    if (selectedStatus.length) {
      const kueryStatus = selectedStatus
        .map((status) => {
          switch (status) {
            case 'healthy':
              return AgentStatusKueryHelper.buildKueryForOnlineAgents();
            case 'unhealthy':
              return AgentStatusKueryHelper.buildKueryForErrorAgents();
            case 'offline':
              return AgentStatusKueryHelper.buildKueryForOfflineAgents();
            case 'updating':
              return AgentStatusKueryHelper.buildKueryForUpdatingAgents();
            case 'inactive':
              return AgentStatusKueryHelper.buildKueryForInactiveAgents();
          }

          return undefined;
        })
        .filter((statusKuery) => statusKuery !== undefined)
        .join(' or ');

      if (kueryBuilder) {
        kueryBuilder = `(${kueryBuilder}) and (${kueryStatus})`;
      } else {
        kueryBuilder = kueryStatus;
      }
    }

    return kueryBuilder;
  }, [selectedStatus, selectedAgentPolicies, search]);

  const showInactive = useMemo(() => {
    return selectedStatus.includes('inactive');
  }, [selectedStatus]);

  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentsStatus, setAgentsStatus] = useState<
    { [key in SimplifiedAgentStatus]: number } | undefined
  >();
  const [isLoading, setIsLoading] = useState(false);
  const [totalAgents, setTotalAgents] = useState(0);
  const [totalInactiveAgents, setTotalInactiveAgents] = useState(0);

  // Request to fetch agents and agent status
  const currentRequestRef = useRef<number>(0);
  const fetchData = useCallback(() => {
    async function fetchDataAsync() {
      currentRequestRef.current++;
      const currentRequest = currentRequestRef.current;

      try {
        setIsLoading(true);
        const [agentsRequest, agentsStatusRequest] = await Promise.all([
          sendGetAgents({
            page: pagination.currentPage,
            perPage: pagination.pageSize,
            kuery: kuery && kuery !== '' ? kuery : undefined,
            showInactive,
            showUpgradeable,
          }),
          sendGetAgentStatus({
            kuery: kuery && kuery !== '' ? kuery : undefined,
          }),
        ]);
        // Return if a newer request as been triggered
        if (currentRequestRef.current !== currentRequest) {
          return;
        }
        if (agentsRequest.error) {
          throw agentsRequest.error;
        }
        if (!agentsRequest.data) {
          throw new Error('Invalid GET /agents response');
        }
        if (agentsStatusRequest.error) {
          throw agentsStatusRequest.error;
        }
        if (!agentsStatusRequest.data) {
          throw new Error('Invalid GET /agents-status response');
        }

        setAgentsStatus({
          healthy: agentsStatusRequest.data.results.online,
          unhealthy: agentsStatusRequest.data.results.error,
          offline: agentsStatusRequest.data.results.offline,
          updating: agentsStatusRequest.data.results.updating,
          inactive: agentsRequest.data.totalInactive,
        });

        setAgents(agentsRequest.data.items);
        setTotalAgents(agentsRequest.data.total);
        setTotalInactiveAgents(agentsRequest.data.totalInactive);
      } catch (error) {
        notifications.toasts.addError(error, {
          title: i18n.translate('xpack.fleet.agentList.errorFetchingDataTitle', {
            defaultMessage: 'Error fetching agents',
          }),
        });
      }
      setIsLoading(false);
    }
    fetchDataAsync();
  }, [pagination, kuery, showInactive, showUpgradeable, notifications.toasts]);

  // Send request to get agent list and status
  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData();
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [fetchData]);

  const agentPoliciesRequest = useGetAgentPolicies({
    page: 1,
    perPage: 1000,
    full: true,
  });

  const agentPolicies = useMemo(
    () => (agentPoliciesRequest.data ? agentPoliciesRequest.data.items : []),
    [agentPoliciesRequest]
  );
  const agentPoliciesIndexedById = useMemo(() => {
    return agentPolicies.reduce((acc, agentPolicy) => {
      acc[agentPolicy.id] = agentPolicy;

      return acc;
    }, {} as { [k: string]: AgentPolicy });
  }, [agentPolicies]);

  const isAgentSelectable = (agent: Agent) => {
    if (!agent.active) return false;
    if (!agent.policy_id) return true;

    const agentPolicy = agentPoliciesIndexedById[agent.policy_id];
    const isHosted = agentPolicy?.is_managed === true;
    return !isHosted;
  };

  const agentToUnenrollHasFleetServer = useMemo(() => {
    if (!agentToUnenroll || !agentToUnenroll.policy_id) {
      return false;
    }

    const agentPolicy = agentPoliciesIndexedById[agentToUnenroll.policy_id];

    if (!agentPolicy) {
      return false;
    }

    return agentPolicy.package_policies.some(
      (ap: string | PackagePolicy) =>
        typeof ap !== 'string' && ap.package?.name === FLEET_SERVER_PACKAGE
    );
  }, [agentToUnenroll, agentPoliciesIndexedById]);

  // Fleet server unhealthy status
  const { isUnhealthy: isFleetServerUnhealthy } = useFleetServerUnhealthy();
  const onClickAddFleetServer = useCallback(() => {
    flyoutContext?.openFleetServerFlyout();
  }, [flyoutContext]);

  const columns = [
    {
      field: 'local_metadata.host.hostname',
      name: i18n.translate('xpack.fleet.agentList.hostColumnTitle', {
        defaultMessage: 'Host',
      }),
      render: (host: string, agent: Agent) => (
        <EuiLink href={getHref('agent_details', { agentId: agent.id })}>
          {safeMetadata(host)}
        </EuiLink>
      ),
    },
    {
      field: 'active',
      width: '120px',
      name: i18n.translate('xpack.fleet.agentList.statusColumnTitle', {
        defaultMessage: 'Status',
      }),
      render: (active: boolean, agent: any) => <AgentHealth agent={agent} />,
    },
    {
      field: 'policy_id',
      name: i18n.translate('xpack.fleet.agentList.policyColumnTitle', {
        defaultMessage: 'Agent policy',
      }),
      render: (policyId: string, agent: Agent) => {
        const agentPolicy = agentPoliciesIndexedById[policyId];
        const showWarning = agent.policy_revision && agentPolicy?.revision > agent.policy_revision;

        return (
          <EuiFlexGroup gutterSize="s" alignItems="center" style={{ minWidth: 0 }}>
            {agentPolicy && <AgentPolicySummaryLine policy={agentPolicy} />}
            {showWarning && (
              <EuiFlexItem grow={false}>
                <EuiText color="subdued" size="xs" className="eui-textNoWrap">
                  <EuiIcon size="m" type="alert" color="warning" />
                  &nbsp;
                  <FormattedMessage
                    id="xpack.fleet.agentList.outOfDateLabel"
                    defaultMessage="Out-of-date"
                  />
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        );
      },
    },
    {
      field: 'local_metadata.elastic.agent.version',
      width: '200px',
      name: i18n.translate('xpack.fleet.agentList.versionTitle', {
        defaultMessage: 'Version',
      }),
      render: (version: string, agent: Agent) => (
        <EuiFlexGroup gutterSize="s" alignItems="center" style={{ minWidth: 0 }}>
          <EuiFlexItem grow={false} className="eui-textNoWrap">
            {safeMetadata(version)}
          </EuiFlexItem>
          {isAgentSelectable(agent) && isAgentUpgradeable(agent, kibanaVersion) ? (
            <EuiFlexItem grow={false}>
              <EuiText color="subdued" size="xs" className="eui-textNoWrap">
                <EuiIcon size="m" type="alert" color="warning" />
                &nbsp;
                <FormattedMessage
                  id="xpack.fleet.agentList.agentUpgradeLabel"
                  defaultMessage="Upgrade available"
                />
              </EuiText>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      ),
    },
    {
      field: 'last_checkin',
      name: i18n.translate('xpack.fleet.agentList.lastCheckinTitle', {
        defaultMessage: 'Last activity',
      }),
      render: (lastCheckin: string, agent: any) =>
        lastCheckin ? <FormattedRelative value={lastCheckin} /> : null,
    },
    {
      name: i18n.translate('xpack.fleet.agentList.actionsColumnTitle', {
        defaultMessage: 'Actions',
      }),
      actions: [
        {
          render: (agent: Agent) => {
            const agentPolicy =
              typeof agent.policy_id === 'string'
                ? agentPoliciesIndexedById[agent.policy_id]
                : undefined;
            return (
              <RowActions
                agent={agent}
                agentPolicy={agentPolicy}
                refresh={() => fetchData()}
                onReassignClick={() => setAgentToReassign(agent)}
                onUnenrollClick={() => setAgentToUnenroll(agent)}
                onUpgradeClick={() => setAgentToUpgrade(agent)}
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
            id="xpack.fleet.agentList.noAgentsPrompt"
            defaultMessage="No agents enrolled"
          />
        </h2>
      }
      actions={
        hasFleetAllPrivileges ? (
          <EuiButton
            fill
            iconType="plusInCircle"
            onClick={() => setEnrollmentFlyoutState({ isOpen: true })}
          >
            <FormattedMessage id="xpack.fleet.agentList.addButton" defaultMessage="Add agent" />
          </EuiButton>
        ) : null
      }
    />
  );

  return (
    <>
      {enrollmentFlyout.isOpen ? (
        <EuiPortal>
          <AgentEnrollmentFlyout
            agentPolicy={agentPolicies.find((p) => p.id === enrollmentFlyout.selectedPolicyId)}
            onClose={() => setEnrollmentFlyoutState({ isOpen: false })}
          />
        </EuiPortal>
      ) : null}
      {agentToReassign && (
        <EuiPortal>
          <AgentReassignAgentPolicyModal
            agents={[agentToReassign]}
            onClose={() => {
              setAgentToReassign(undefined);
              fetchData();
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
              fetchData();
            }}
            useForceUnenroll={agentToUnenroll.status === 'unenrolling'}
            hasFleetServer={agentToUnenrollHasFleetServer}
          />
        </EuiPortal>
      )}

      {agentToUpgrade && (
        <EuiPortal>
          <AgentUpgradeAgentModal
            agents={[agentToUpgrade]}
            agentCount={1}
            onClose={() => {
              setAgentToUpgrade(undefined);
              fetchData();
            }}
            version={kibanaVersion}
          />
        </EuiPortal>
      )}

      {isFleetServerUnhealthy && (
        <>
          {cloud?.deploymentUrl ? (
            <FleetServerCloudUnhealthyCallout deploymentUrl={cloud.deploymentUrl} />
          ) : (
            <FleetServerOnPremUnhealthyCallout onClickAddFleetServer={onClickAddFleetServer} />
          )}
          <EuiSpacer size="l" />
        </>
      )}

      {/* Search and filter bar */}
      <SearchAndFilterBar
        agentPolicies={agentPolicies}
        draftKuery={draftKuery}
        onDraftKueryChange={setDraftKuery}
        onSubmitSearch={onSubmitSearch}
        selectedAgentPolicies={selectedAgentPolicies}
        onSelectedAgentPoliciesChange={setSelectedAgentPolicies}
        selectedStatus={selectedStatus}
        onSelectedStatusChange={setSelectedStatus}
        showUpgradeable={showUpgradeable}
        onShowUpgradeableChange={setShowUpgradeable}
      />
      <EuiSpacer size="m" />

      {/* Agent total, bulk actions and status bar */}
      <AgentTableHeader
        showInactive={showInactive}
        totalAgents={totalAgents}
        totalInactiveAgents={totalInactiveAgents}
        agentStatus={agentsStatus}
        selectableAgents={agents?.filter(isAgentSelectable).length || 0}
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
        refreshAgents={() => fetchData()}
      />
      <EuiSpacer size="s" />

      {/* Agent list table */}
      <EuiBasicTable<Agent>
        ref={tableRef}
        className="fleet__agentList__table"
        data-test-subj="fleetAgentListTable"
        loading={isLoading}
        hasActions={true}
        noItemsMessage={
          isLoading && currentRequestRef.current === 1 ? (
            <FormattedMessage
              id="xpack.fleet.agentList.loadingAgentsMessage"
              defaultMessage="Loading agents…"
            />
          ) : isUsingFilter ? (
            <FormattedMessage
              id="xpack.fleet.agentList.noFilteredAgentsPrompt"
              defaultMessage="No agents found. {clearFiltersLink}"
              values={{
                clearFiltersLink: (
                  <EuiLink onClick={() => clearFilters()}>
                    <FormattedMessage
                      id="xpack.fleet.agentList.clearFiltersLinkText"
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
        items={
          totalAgents
            ? showUpgradeable
              ? agents.filter(
                  (agent) => isAgentSelectable(agent) && isAgentUpgradeable(agent, kibanaVersion)
                )
              : agents
            : []
        }
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
                selectable: isAgentSelectable,
                selectableMessage: (selectable, agent) => {
                  if (selectable) return '';
                  if (!agent.active) {
                    return 'This agent is not active';
                  }
                  if (agent.policy_id && agentPoliciesIndexedById[agent.policy_id].is_managed) {
                    return 'This action is not available for agents enrolled in an externally managed agent policy';
                  }
                  return '';
                },
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
