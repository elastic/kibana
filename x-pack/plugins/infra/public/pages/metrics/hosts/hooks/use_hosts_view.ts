/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import createContainer from 'constate';

import { InitializedHostsViewPageState } from '../machines/page_state/state_machine';
import { useFetchHosts } from './use_fetch_hosts';
import { HostsViewPageCallbacks } from '../machines/page_state/types';

export const useHostsView = ({
  hostsViewPageState,
  hostsViewPageCallbacks,
}: {
  hostsViewPageState: InitializedHostsViewPageState;
  hostsViewPageCallbacks: HostsViewPageCallbacks;
}) => {
  const {
    parsedQuery,
    isoTimeRange,
    timestamps,
    filters,
    query,
    timeRange,
    controlPanels,
    panelFilters,
  } = hostsViewPageState.context;

  const { fetchHosts, error, hostNodes, loading, searchSessionId } = useFetchHosts({
    parsedQuery,
    isoTimeRange,
  });

  const actions = useMemo(() => {
    const { updateControlPanels, updateControlPanelFilters, updateTimeRange } =
      hostsViewPageCallbacks;

    return {
      updateControlPanels,
      updateControlPanelFilters,
      updateTimeRange,
    };
  }, [hostsViewPageCallbacks]);

  useEffect(() => {
    fetchHosts();
  }, [fetchHosts]);

  return {
    actions,
    searchCriteria: {
      filters,
      query,
      timeRange,
      parsedQuery,
      isoTimeRange,
      timestamps,
      panelFilters,
    },
    controlPanels,
    hostNodes,
    searchSessionId,
    fetchHosts,
    error,
    loading,
  };
};

export const HostsView = createContainer(useHostsView);
export const [HostsViewProvider, useHostsViewContext] = HostsView;
