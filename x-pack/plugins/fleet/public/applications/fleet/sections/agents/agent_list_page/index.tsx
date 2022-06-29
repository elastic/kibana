/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { differenceBy, isEqual } from 'lodash';
import {
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiText,
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
  useKibanaVersion,
  useStartServices,
  useFlyoutContext,
} from '../../../hooks';
import { AgentEnrollmentFlyout, AgentPolicySummaryLine } from '../../../components';
import { AgentStatusKueryHelper, isAgentUpgradeable } from '../../../services';
import { AGENTS_PREFIX, FLEET_SERVER_PACKAGE, SO_SEARCH_LIMIT } from '../../../constants';
import {
  AgentReassignAgentPolicyModal,
  AgentHealth,
  AgentUnenrollAgentModal,
  AgentUpgradeAgentModal,
  FleetServerCloudUnhealthyCallout,
  FleetServerOnPremUnhealthyCallout,
} from '../components';
import { useFleetServerUnhealthy } from '../hooks/use_fleet_server_unhealthy';

import { CurrentBulkUpgradeCallout } from './components';
import { AgentTableHeader } from './components/table_header';
import type { SelectionMode } from './components/types';
import { SearchAndFilterBar } from './components/search_and_filter_bar';
import { Tags } from './components/tags';
import { TagsAddRemove } from './components/tags_add_remove';
import { TableRowActions } from './components/table_row_actions';
import { EmptyPrompt } from './components/empty_prompt';
import { useCurrentUpgrades } from './hooks';

const REFRESH_INTERVAL_MS = 30000;

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
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);

  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const isUsingFilter =
    search.trim() ||
    selectedAgentPolicies.length ||
    selectedStatus.length ||
    selectedTags.length ||
    showUpgradeable;

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

  const flyoutContext = useFlyoutContext();

  // Agent actions states
  const [agentToReassign, setAgentToReassign] = useState<Agent | undefined>(undefined);
  const [agentToUnenroll, setAgentToUnenroll] = useState<Agent | undefined>(undefined);
  const [agentToUpgrade, setAgentToUpgrade] = useState<Agent | undefined>(undefined);
  const [agentToAddRemoveTags, setAgentToAddRemoveTags] = useState<Agent | undefined>(undefined);
  const [tagsPopoverButton, setTagsPopoverButton] = useState<HTMLElement>();
  const [showTagsAddRemove, setShowTagsAddRemove] = useState(false);

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

    if (selectedTags.length) {
      if (kueryBuilder) {
        kueryBuilder = `(${kueryBuilder}) and`;
      }
      kueryBuilder = `${kueryBuilder} ${AGENTS_PREFIX}.tags : (${selectedTags
        .map((tag) => `"${tag}"`)
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
  }, [search, selectedAgentPolicies, selectedTags, selectedStatus]);

  const showInactive = useMemo(() => {
    return selectedStatus.includes('inactive');
  }, [selectedStatus]);

  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentsStatus, setAgentsStatus] = useState<
    { [key in SimplifiedAgentStatus]: number } | undefined
  >();
  const [allTags, setAllTags] = useState<string[]>();
  const [isLoading, setIsLoading] = useState(false);
  const [totalAgents, setTotalAgents] = useState(0);
  const [totalInactiveAgents, setTotalInactiveAgents] = useState(0);

  const getSortFieldForAPI = (field: keyof Agent): string => {
    if ([VERSION_FIELD, HOSTNAME_FIELD].includes(field as string)) {
      return `${field}.keyword`;
    }
    return field;
  };

  const sorting = {
    sort: {
      field: sortField,
      direction: sortOrder,
    },
  };

  // Request to fetch agents and agent status
  const currentRequestRef = useRef<number>(0);
  const fetchData = useCallback(
    ({ refreshTags = false }: { refreshTags?: boolean } = {}) => {
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
              sortField: getSortFieldForAPI(sortField),
              sortOrder,
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

          const newAllTags = Array.from(
            new Set(agentsRequest.data.items.flatMap((agent) => agent.tags ?? []))
          );

          // We only want to update the list of available tags if
          // - We haven't set any tags yet
          // - We've received the "refreshTags" flag which will force a refresh of the tags list when an agent is unenrolled
          // - Tags are modified (add, remove, edit)
          if (!allTags || refreshTags || !isEqual(newAllTags, allTags)) {
            setAllTags(newAllTags);
          }

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
    },
    [
      pagination.currentPage,
      pagination.pageSize,
      kuery,
      showInactive,
      showUpgradeable,
      allTags,
      notifications.toasts,
      sortField,
      sortOrder,
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

  const isAgentSelectable = (agent: Agent) => {
    if (!agent.active) return false;
    if (!agent.policy_id) return true;

    const agentPolicy = agentPoliciesIndexedById[agent.policy_id];
    const isHosted = agentPolicy?.is_managed === true;
    return !isHosted;
  };

  const onSelectionChange = (newAgents: Agent[]) => {
    setSelectedAgents(newAgents);
    if (selectionMode === 'query' && newAgents.length < selectedAgents.length) {
      // differentiating between selection changed by agents dropping from current page or user action
      const areSelectedAgentsStillVisible =
        selectedAgents.length > 0 && differenceBy(selectedAgents, agents, 'id').length === 0;
      if (areSelectedAgentsStillVisible) {
        setSelectionMode('manual');
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

    return agentPolicy.package_policies.some(
      (ap: string | PackagePolicy) =>
        typeof ap !== 'string' && ap.package?.name === FLEET_SERVER_PACKAGE
    );
  }, [agentToUnenroll, agentPoliciesIndexedById]);

  // Fleet server unhealthy status
  const { isUnhealthy: isFleetServerUnhealthy } = useFleetServerUnhealthy();
  const onClickAddFleetServer = useCallback(() => {
    flyoutContext.openFleetServerFlyout();
  }, [flyoutContext]);

  // Current upgrades
  const { abortUpgrade, currentUpgrades, refreshUpgrades } = useCurrentUpgrades(fetchData);

  const columns = [
    {
      field: HOSTNAME_FIELD,
      sortable: true,
      name: i18n.translate('xpack.fleet.agentList.hostColumnTitle', {
        defaultMessage: 'Host',
      }),
      width: '185px',
      render: (host: string, agent: Agent) => (
        <EuiLink href={getHref('agent_details', { agentId: agent.id })}>
          {safeMetadata(host)}
        </EuiLink>
      ),
    },
    {
      field: 'active',
      sortable: false,
      width: '85px',
      name: i18n.translate('xpack.fleet.agentList.statusColumnTitle', {
        defaultMessage: 'Status',
      }),
      render: (active: boolean, agent: any) => <AgentHealth agent={agent} />,
    },
    {
      field: 'tags',
      sortable: false,
      width: '210px',
      name: i18n.translate('xpack.fleet.agentList.tagsColumnTitle', {
        defaultMessage: 'Tags',
      }),
      render: (tags: string[] = [], agent: any) => <Tags tags={tags} />,
    },
    {
      field: 'policy_id',
      sortable: true,
      name: i18n.translate('xpack.fleet.agentList.policyColumnTitle', {
        defaultMessage: 'Agent policy',
      }),
      width: '260px',
      render: (policyId: string, agent: Agent) => {
        const agentPolicy = agentPoliciesIndexedById[policyId];
        const showWarning = agent.policy_revision && agentPolicy?.revision > agent.policy_revision;

        return (
          <EuiFlexGroup gutterSize="none" style={{ minWidth: 0 }} direction="column">
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
      field: VERSION_FIELD,
      sortable: true,
      width: '135px',
      name: i18n.translate('xpack.fleet.agentList.versionTitle', {
        defaultMessage: 'Version',
      }),
      render: (version: string, agent: Agent) => (
        <EuiFlexGroup gutterSize="none" style={{ minWidth: 0 }} direction="column">
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
      sortable: true,
      name: i18n.translate('xpack.fleet.agentList.lastCheckinTitle', {
        defaultMessage: 'Last activity',
      }),
      width: '180px',
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

            // refreshing agent tags passed to TagsAddRemove component
            if (
              agentToAddRemoveTags?.id === agent.id &&
              !isEqual(agent.tags, agentToAddRemoveTags.tags)
            ) {
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
                allTags={allTags ?? []}
              />
            );
          },
        },
      ],
      width: '100px',
    },
  ];

  return (
    <>
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
              fetchData({ refreshTags: true });
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
              refreshUpgrades();
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
            fetchData();
          }}
        />
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
      {/* Current upgrades callout */}
      {currentUpgrades.map((currentUpgrade) => (
        <React.Fragment key={currentUpgrade.actionId}>
          <CurrentBulkUpgradeCallout currentUpgrade={currentUpgrade} abortUpgrade={abortUpgrade} />
          <EuiSpacer size="l" />
        </React.Fragment>
      ))}
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
        refreshAgents={({ refreshTags = false }: { refreshTags?: boolean } = {}) =>
          Promise.all([fetchData({ refreshTags }), refreshUpgrades()])
        }
        onClickAddAgent={() => setEnrollmentFlyoutState({ isOpen: true })}
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
            <EmptyPrompt
              hasFleetAllPrivileges={hasFleetAllPrivileges}
              setEnrollmentFlyoutState={setEnrollmentFlyoutState}
            />
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
          totalItemCount: Math.min(totalAgents, SO_SEARCH_LIMIT),
          pageSizeOptions,
        }}
        isSelectable={true}
        selection={{
          onSelectionChange,
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
        }}
        onChange={({
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
        }}
        sorting={sorting}
      />
    </>
  );
};
