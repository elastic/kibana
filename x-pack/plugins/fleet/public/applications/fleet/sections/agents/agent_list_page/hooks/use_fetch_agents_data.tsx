/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { isEqual } from 'lodash';
import { useHistory } from 'react-router-dom';

import { agentStatusesToSummary } from '../../../../../../../common/services';

import type { Agent, AgentPolicy, SimplifiedAgentStatus } from '../../../../types';
import {
  usePagination,
  useGetAgentPolicies,
  sendGetAgents,
  sendGetAgentStatus,
  useUrlParams,
  useStartServices,
  sendGetAgentTags,
  sendGetAgentPolicies,
  useAuthz,
} from '../../../../hooks';
import { AgentStatusKueryHelper, ExperimentalFeaturesService } from '../../../../services';
import { AGENT_POLICY_SAVED_OBJECT_TYPE, SO_SEARCH_LIMIT } from '../../../../constants';

import { getKuery } from '../utils/get_kuery';

const REFRESH_INTERVAL_MS = 30000;

export function useFetchAgentsData() {
  const authz = useAuthz();
  const { displayAgentMetrics } = ExperimentalFeaturesService.get();

  const { notifications } = useStartServices();

  const history = useHistory();
  const { urlParams, toUrlParams } = useUrlParams();
  const defaultKuery: string = (urlParams.kuery as string) || '';

  // Agent data states
  const [showUpgradeable, setShowUpgradeable] = useState<boolean>(false);

  // Table and search states
  const [draftKuery, setDraftKuery] = useState<string>(defaultKuery);
  const [search, setSearchState] = useState<string>(defaultKuery);
  const { pagination, pageSizeOptions, setPagination } = usePagination();
  const [sortField, setSortField] = useState<keyof Agent>('enrolled_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const VERSION_FIELD = 'local_metadata.elastic.agent.version';
  const HOSTNAME_FIELD = 'local_metadata.host.hostname';

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

  const showInactive = useMemo(() => {
    return selectedStatus.some((status) => status === 'inactive' || status === 'unenrolled');
  }, [selectedStatus]);

  const setSearch = useCallback(
    (newVal: string) => {
      setSearchState(newVal);
      if (newVal.trim() === '' && !urlParams.kuery) {
        return;
      }

      if (urlParams.kuery !== newVal) {
        history.replace({
          search: toUrlParams({ ...urlParams, kuery: newVal === '' ? undefined : newVal }),
        });
      }
    },
    [urlParams, history, toUrlParams]
  );

  // filters kuery
  const kuery = useMemo(() => {
    return getKuery({
      search,
      selectedAgentPolicies,
      selectedTags,
      selectedStatus,
    });
  }, [search, selectedAgentPolicies, selectedStatus, selectedTags]);

  const [agentsOnCurrentPage, setAgentsOnCurrentPage] = useState<Agent[]>([]);
  const [agentsStatus, setAgentsStatus] = useState<
    { [key in SimplifiedAgentStatus]: number } | undefined
  >();
  const [allTags, setAllTags] = useState<string[]>();
  const [isLoading, setIsLoading] = useState(false);
  const [nAgentsInTable, setNAgentsInTable] = useState(0);
  const [totalInactiveAgents, setTotalInactiveAgents] = useState(0);
  const [totalManagedAgentIds, setTotalManagedAgentIds] = useState<string[]>([]);
  const [managedAgentsOnCurrentPage, setManagedAgentsOnCurrentPage] = useState(0);

  const getSortFieldForAPI = (field: keyof Agent): string => {
    if ([VERSION_FIELD, HOSTNAME_FIELD].includes(field as string)) {
      return `${field}.keyword`;
    }
    return field;
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
          const [
            agentsResponse,
            totalInactiveAgentsResponse,
            managedAgentPoliciesResponse,
            agentTagsResponse,
          ] = await Promise.all([
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
            sendGetAgentPolicies({
              kuery: `${AGENT_POLICY_SAVED_OBJECT_TYPE}.is_managed:true`,
              perPage: SO_SEARCH_LIMIT,
              full: false,
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
          if (managedAgentPoliciesResponse.error) {
            throw new Error(managedAgentPoliciesResponse.error.message);
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

          setAgentsOnCurrentPage(agentsResponse.data.items);
          setNAgentsInTable(agentsResponse.data.total);
          setTotalInactiveAgents(totalInactiveAgentsResponse.data.results.inactive || 0);

          const managedAgentPolicies = managedAgentPoliciesResponse.data?.items ?? [];

          if (managedAgentPolicies.length === 0) {
            setTotalManagedAgentIds([]);
            setManagedAgentsOnCurrentPage(0);
          } else {
            // Find all the agents that have managed policies and are not unenrolled
            const policiesKuery = managedAgentPolicies
              .map((policy) => `policy_id:"${policy.id}"`)
              .join(' or ');
            const response = await sendGetAgents({
              kuery: `NOT (status:unenrolled) and ${policiesKuery}`,
              perPage: SO_SEARCH_LIMIT,
              showInactive: true,
            });
            if (response.error) {
              throw new Error(response.error.message);
            }
            const allManagedAgents = response.data?.items ?? [];
            const allManagedAgentIds = allManagedAgents?.map((agent) => agent.id);
            setTotalManagedAgentIds(allManagedAgentIds);

            setManagedAgentsOnCurrentPage(
              agentsResponse.data.items
                .map((agent) => agent.id)
                .filter((agentId) => allManagedAgentIds.includes(agentId)).length
            );
          }
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
    full: authz.fleet.readAgentPolicies,
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

  return {
    allTags,
    setAllTags,
    agentsOnCurrentPage,
    agentsStatus,
    isLoading,
    nAgentsInTable,
    totalInactiveAgents,
    totalManagedAgentIds,
    managedAgentsOnCurrentPage,
    showUpgradeable,
    setShowUpgradeable,
    search,
    setSearch,
    selectedAgentPolicies,
    setSelectedAgentPolicies,
    sortField,
    setSortField,
    sortOrder,
    setSortOrder,
    selectedStatus,
    setSelectedStatus,
    selectedTags,
    setSelectedTags,
    agentPolicies,
    agentPoliciesRequest,
    agentPoliciesIndexedById,
    pagination,
    pageSizeOptions,
    setPagination,
    kuery,
    draftKuery,
    setDraftKuery,
    fetchData,
    currentRequestRef,
  };
}
