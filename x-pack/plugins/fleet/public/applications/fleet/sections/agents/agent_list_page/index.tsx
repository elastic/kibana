/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { differenceBy, isEqual } from 'lodash';
import type { EuiBasicTable } from '@elastic/eui';
import { EuiSpacer, EuiPortal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { agentStatusesToSummary } from '../../../../../../common/services';

import type { Agent, AgentPolicy, SimplifiedAgentStatus } from '../../../types';
import {
  usePagination,
  useGetAgentPolicies,
  sendGetAgents,
  sendGetAgentStatus,
  useUrlParams,
  useBreadcrumbs,
  useStartServices,
  useFlyoutContext,
  sendGetAgentTags,
  useFleetServerStandalone,
} from '../../../hooks';
import { AgentEnrollmentFlyout, UninstallCommandFlyout } from '../../../components';
import {
  AgentStatusKueryHelper,
  ExperimentalFeaturesService,
  policyHasFleetServer,
} from '../../../services';
import { SO_SEARCH_LIMIT } from '../../../constants';
import {
  AgentReassignAgentPolicyModal,
  AgentUnenrollAgentModal,
  AgentUpgradeAgentModal,
  FleetServerCloudUnhealthyCallout,
  FleetServerOnPremUnhealthyCallout,
} from '../components';
import { useFleetServerUnhealthy } from '../hooks/use_fleet_server_unhealthy';

import { AgentRequestDiagnosticsModal } from '../components/agent_request_diagnostics_modal';

import { AgentTableHeader } from './components/table_header';
import type { SelectionMode } from './components/types';
import { SearchAndFilterBar } from './components/search_and_filter_bar';
import { TagsAddRemove } from './components/tags_add_remove';
import { AgentActivityFlyout } from './components';
import { TableRowActions } from './components/table_row_actions';
import { AgentListTable } from './components/agent_list_table';
import { getKuery } from './utils/get_kuery';

const REFRESH_INTERVAL_MS = 30000;

export const AgentListPage: React.FunctionComponent<{}> = () => {
  const { displayAgentMetrics } = ExperimentalFeaturesService.get();

  const { notifications, cloud } = useStartServices();
  useBreadcrumbs('agent_list');
  const defaultKuery: string = (useUrlParams().urlParams.kuery as string) || '';

  // Agent data states
  const [showUpgradeable, setShowUpgradeable] = useState<boolean>(false);

  // Table and search states
  const [draftKuery, setDraftKuery] = useState<string>(defaultKuery);
  const [search, setSearch] = useState<string>(defaultKuery);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('manual');
  const [selectedAgents, setSelectedAgents] = useState<Agent[]>([]);
  const tableRef = useRef<EuiBasicTable<Agent>>(null);
  const { pagination, pageSizeOptions, setPagination } = usePagination();
  const [sortField, setSortField] = useState<keyof Agent>('enrolled_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const VERSION_FIELD = 'local_metadata.elastic.agent.version';
  const HOSTNAME_FIELD = 'local_metadata.host.hostname';

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
  const [selectedStatus, setSelectedStatus] = useState<string[]>([
    'healthy',
    'unhealthy',
    'updating',
    'offline',
  ]);

  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const isUsingFilter = !!(
    search.trim() ||
    selectedAgentPolicies.length ||
    selectedStatus.length ||
    selectedTags.length ||
    showUpgradeable
  );

  const clearFilters = useCallback(() => {
    setDraftKuery('');
    setSearch('');
    setSelectedAgentPolicies([]);
    setSelectedStatus([]);
    setSelectedTags([]);
    setShowUpgradeable(false);
  }, [setSearch, setDraftKuery, setSelectedAgentPolicies, setSelectedStatus, setShowUpgradeable]);

  // Agent enrollment flyout state
  const [enrollmentFlyout, setEnrollmentFlyoutState] = useState<{
    isOpen: boolean;
    selectedPolicyId?: string;
  }>({
    isOpen: false,
  });

  const [isAgentActivityFlyoutOpen, setAgentActivityFlyoutOpen] = useState(false);

  const flyoutContext = useFlyoutContext();

  // Agent actions states
  const [agentToReassign, setAgentToReassign] = useState<Agent | undefined>(undefined);
  const [agentToUnenroll, setAgentToUnenroll] = useState<Agent | undefined>(undefined);
  const [agentToGetUninstallCommand, setAgentToGetUninstallCommand] = useState<Agent | undefined>(
    undefined
  );
  const [agentToUpgrade, setAgentToUpgrade] = useState<Agent | undefined>(undefined);
  const [agentToAddRemoveTags, setAgentToAddRemoveTags] = useState<Agent | undefined>(undefined);
  const [tagsPopoverButton, setTagsPopoverButton] = useState<HTMLElement>();
  const [showTagsAddRemove, setShowTagsAddRemove] = useState(false);
  const [agentToRequestDiagnostics, setAgentToRequestDiagnostics] = useState<Agent | undefined>(
    undefined
  );

  const onTableChange = ({
    page,
    sort,
  }: {
    page?: { index: number; size: number };
    sort?: { field: keyof Agent; direction: 'asc' | 'desc' };
  }) => {
    const newPagination = {
      ...pagination,
      currentPage: page!.index + 1,
      pageSize: page!.size,
    };
    setPagination(newPagination);
    setSortField(sort!.field);
    setSortOrder(sort!.direction);
  };

  const showInactive = useMemo(() => {
    return selectedStatus.some((status) => status === 'inactive' || status === 'unenrolled');
  }, [selectedStatus]);

  // filters kuery
  const kuery = useMemo(() => {
    return getKuery({
      search,
      selectedAgentPolicies,
      selectedTags,
      selectedStatus,
    });
  }, [search, selectedAgentPolicies, selectedStatus, selectedTags]);

  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentsStatus, setAgentsStatus] = useState<
    { [key in SimplifiedAgentStatus]: number } | undefined
  >();
  const [allTags, setAllTags] = useState<string[]>();
  const [isLoading, setIsLoading] = useState(false);
  const [totalAgents, setTotalAgents] = useState(0);
  const [totalInactiveAgents, setTotalInactiveAgents] = useState(0);
  const [showAgentActivityTour, setShowAgentActivityTour] = useState({ isOpen: false });
  const getSortFieldForAPI = (field: keyof Agent): string => {
    if ([VERSION_FIELD, HOSTNAME_FIELD].includes(field as string)) {
      return `${field}.keyword`;
    }
    return field;
  };

  const renderActions = (agent: Agent) => {
    const agentPolicy =
      typeof agent.policy_id === 'string' ? agentPoliciesIndexedById[agent.policy_id] : undefined;

    // refreshing agent tags passed to TagsAddRemove component
    if (agentToAddRemoveTags?.id === agent.id && !isEqual(agent.tags, agentToAddRemoveTags.tags)) {
      setAgentToAddRemoveTags(agent);
    }
    return (
      <TableRowActions
        agent={agent}
        agentPolicy={agentPolicy}
        onReassignClick={() => setAgentToReassign(agent)}
        onUnenrollClick={() => setAgentToUnenroll(agent)}
        onUpgradeClick={() => setAgentToUpgrade(agent)}
        onAddRemoveTagsClick={(button) => {
          setTagsPopoverButton(button);
          setAgentToAddRemoveTags(agent);
          setShowTagsAddRemove(!showTagsAddRemove);
        }}
        onGetUninstallCommandClick={() => setAgentToGetUninstallCommand(agent)}
        onRequestDiagnosticsClick={() => setAgentToRequestDiagnostics(agent)}
      />
    );
  };

  const isLoadingVar = useRef<boolean>(false);

  // Request to fetch agents and agent status
  const currentRequestRef = useRef<number>(0);
  const fetchData = useCallback(
    ({ refreshTags = false }: { refreshTags?: boolean } = {}) => {
      async function fetchDataAsync() {
        // skipping refresh if previous request is in progress
        if (isLoadingVar.current) {
          return;
        }
        currentRequestRef.current++;
        const currentRequest = currentRequestRef.current;
        isLoadingVar.current = true;

        try {
          setIsLoading(true);
          const [agentsResponse, totalInactiveAgentsResponse, agentTagsResponse] =
            await Promise.all([
              sendGetAgents({
                page: pagination.currentPage,
                perPage: pagination.pageSize,
                kuery: kuery && kuery !== '' ? kuery : undefined,
                sortField: getSortFieldForAPI(sortField),
                sortOrder,
                showInactive,
                showUpgradeable,
                getStatusSummary: true,
                withMetrics: displayAgentMetrics,
              }),
              sendGetAgentStatus({
                kuery: AgentStatusKueryHelper.buildKueryForInactiveAgents(),
              }),
              sendGetAgentTags({
                kuery: kuery && kuery !== '' ? kuery : undefined,
                showInactive,
              }),
            ]);
          isLoadingVar.current = false;
          // Return if a newer request has been triggered
          if (currentRequestRef.current !== currentRequest) {
            return;
          }
          if (agentsResponse.error) {
            throw agentsResponse.error;
          }
          if (!agentsResponse.data) {
            throw new Error('Invalid GET /agents response');
          }
          if (!totalInactiveAgentsResponse.data) {
            throw new Error('Invalid GET /agents_status response');
          }
          if (agentTagsResponse.error) {
            throw agentTagsResponse.error;
          }
          if (!agentTagsResponse.data) {
            throw new Error('Invalid GET /agent/tags response');
          }

          const statusSummary = agentsResponse.data.statusSummary;

          if (!statusSummary) {
            throw new Error('Invalid GET /agents response - no status summary');
          }
          setAgentsStatus(agentStatusesToSummary(statusSummary));

          const newAllTags = agentTagsResponse.data.items;

          // We only want to update the list of available tags if
          // - We haven't set any tags yet
          // - We've received the "refreshTags" flag which will force a refresh of the tags list when an agent is unenrolled
          // - Tags are modified (add, remove, edit)
          if (!allTags || refreshTags || !isEqual(newAllTags, allTags)) {
            setAllTags(newAllTags);
          }

          setAgents(agentsResponse.data.items);
          setTotalAgents(agentsResponse.data.total);
          setTotalInactiveAgents(totalInactiveAgentsResponse.data.results.inactive || 0);
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
    },
    [
      pagination.currentPage,
      pagination.pageSize,
      kuery,
      sortField,
      sortOrder,
      showInactive,
      showUpgradeable,
      displayAgentMetrics,
      allTags,
      notifications.toasts,
    ]
  );

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
    perPage: SO_SEARCH_LIMIT,
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

  const isAgentSelectable = useCallback(
    (agent: Agent) => {
      if (!agent.active) return false;
      if (!agent.policy_id) return true;
      const agentPolicy = agentPoliciesIndexedById[agent.policy_id];
      const isHosted = agentPolicy?.is_managed === true;
      return !isHosted;
    },
    [agentPoliciesIndexedById]
  );

  const onSelectionChange = (newAgents: Agent[]) => {
    setSelectedAgents(newAgents);
    if (selectionMode === 'query' && newAgents.length < selectedAgents.length) {
      // differentiating between selection changed by agents dropping from current page or user action
      const areSelectedAgentsStillVisible =
        selectedAgents.length > 0 && differenceBy(selectedAgents, agents, 'id').length === 0;
      if (areSelectedAgentsStillVisible) {
        setSelectionMode('manual');
      } else {
        // force selecting all agents on current page if staying in query mode
        if (tableRef?.current) {
          tableRef.current.setSelection(agents);
        }
      }
    }
  };

  const agentToUnenrollHasFleetServer = useMemo(() => {
    if (!agentToUnenroll || !agentToUnenroll.policy_id) {
      return false;
    }

    const agentPolicy = agentPoliciesIndexedById[agentToUnenroll.policy_id];

    if (!agentPolicy) {
      return false;
    }

    return policyHasFleetServer(agentPolicy);
  }, [agentToUnenroll, agentPoliciesIndexedById]);

  // Fleet server unhealthy status
  const { isUnhealthy: isFleetServerUnhealthy } = useFleetServerUnhealthy();
  const { isFleetServerStandalone } = useFleetServerStandalone();
  const showUnhealthyCallout = isFleetServerUnhealthy && !isFleetServerStandalone;

  const onClickAddFleetServer = useCallback(() => {
    flyoutContext.openFleetServerFlyout();
  }, [flyoutContext]);

  const onClickAgentActivity = useCallback(() => {
    setAgentActivityFlyoutOpen(true);
  }, [setAgentActivityFlyoutOpen]);

  const refreshAgents = ({ refreshTags = false }: { refreshTags?: boolean } = {}) => {
    fetchData({ refreshTags });
    setShowAgentActivityTour({ isOpen: true });
  };

  const isCurrentRequestIncremented = currentRequestRef?.current === 1;
  return (
    <>
      {isAgentActivityFlyoutOpen ? (
        <EuiPortal>
          <AgentActivityFlyout
            onAbortSuccess={fetchData}
            onClose={() => setAgentActivityFlyoutOpen(false)}
            refreshAgentActivity={isLoading}
            setSearch={setSearch}
            setSelectedStatus={setSelectedStatus}
          />
        </EuiPortal>
      ) : null}
      {enrollmentFlyout.isOpen ? (
        <EuiPortal>
          <AgentEnrollmentFlyout
            agentPolicy={agentPolicies.find((p) => p.id === enrollmentFlyout.selectedPolicyId)}
            onClose={() => {
              setEnrollmentFlyoutState({ isOpen: false });
              fetchData();
              agentPoliciesRequest.resendRequest();
            }}
          />
        </EuiPortal>
      ) : null}
      {agentToReassign && (
        <EuiPortal>
          <AgentReassignAgentPolicyModal
            agents={[agentToReassign]}
            onClose={() => {
              setAgentToReassign(undefined);
              refreshAgents();
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
              refreshAgents({ refreshTags: true });
            }}
            useForceUnenroll={agentToUnenroll.status === 'unenrolling'}
            hasFleetServer={agentToUnenrollHasFleetServer}
          />
        </EuiPortal>
      )}
      {agentToGetUninstallCommand && (
        <EuiPortal>
          <UninstallCommandFlyout
            target="agent"
            policyId={agentToGetUninstallCommand.policy_id}
            onClose={() => {
              setAgentToGetUninstallCommand(undefined);
              refreshAgents({ refreshTags: true });
            }}
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
              refreshAgents();
            }}
          />
        </EuiPortal>
      )}
      {agentToRequestDiagnostics && (
        <EuiPortal>
          <AgentRequestDiagnosticsModal
            agents={[agentToRequestDiagnostics]}
            agentCount={1}
            onClose={() => {
              setAgentToRequestDiagnostics(undefined);
            }}
          />
        </EuiPortal>
      )}
      {showTagsAddRemove && (
        <TagsAddRemove
          agentId={agentToAddRemoveTags?.id!}
          allTags={allTags ?? []}
          selectedTags={agentToAddRemoveTags?.tags ?? []}
          button={tagsPopoverButton!}
          onTagsUpdated={() => {
            refreshAgents();
          }}
          onClosePopover={() => {
            setShowTagsAddRemove(false);
          }}
        />
      )}
      {showUnhealthyCallout && (
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
        tags={allTags ?? []}
        selectedTags={selectedTags}
        onSelectedTagsChange={setSelectedTags}
        totalAgents={totalAgents}
        totalInactiveAgents={totalInactiveAgents}
        selectionMode={selectionMode}
        currentQuery={kuery}
        selectedAgents={selectedAgents}
        refreshAgents={refreshAgents}
        onClickAddAgent={() => setEnrollmentFlyoutState({ isOpen: true })}
        onClickAddFleetServer={onClickAddFleetServer}
        visibleAgents={agents}
        onClickAgentActivity={onClickAgentActivity}
        showAgentActivityTour={showAgentActivityTour}
      />
      <EuiSpacer size="m" />
      {/* Agent total, bulk actions and status bar */}
      <AgentTableHeader
        showInactive={showInactive}
        totalAgents={totalAgents}
        agentStatus={agentsStatus}
        selectableAgents={agents?.filter(isAgentSelectable).length || 0}
        selectionMode={selectionMode}
        setSelectionMode={setSelectionMode}
        selectedAgents={selectedAgents}
        setSelectedAgents={(newAgents: Agent[]) => {
          if (tableRef?.current) {
            tableRef.current.setSelection(newAgents);
            setSelectionMode('manual');
          }
        }}
        clearFilters={clearFilters}
        isUsingFilter={isUsingFilter}
      />
      <EuiSpacer size="s" />
      {/* Agent list table */}
      <AgentListTable
        agents={agents}
        sortField={sortField}
        pageSizeOptions={pageSizeOptions}
        sortOrder={sortOrder}
        isLoading={isLoading}
        agentPoliciesIndexedById={agentPoliciesIndexedById}
        renderActions={renderActions}
        onSelectionChange={onSelectionChange}
        tableRef={tableRef}
        showUpgradeable={showUpgradeable}
        onTableChange={onTableChange}
        pagination={pagination}
        totalAgents={Math.min(totalAgents, SO_SEARCH_LIMIT)}
        isUsingFilter={isUsingFilter}
        setEnrollmentFlyoutState={setEnrollmentFlyoutState}
        clearFilters={clearFilters}
        isCurrentRequestIncremented={isCurrentRequestIncremented}
      />
    </>
  );
};
