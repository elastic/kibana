/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { CoreStart } from '@kbn/core/public';
import type { KubernetesCollectionMap, QueryDslQueryContainerBool } from '../../types';
import { addTimerangeAndDefaultFilterToQuery } from '../../utils/add_timerange_and_default_filter_to_query';
import { addTreeNavSelectionToFilterQuery } from './helpers';
import { IndexPattern, GlobalFilter } from '../../types';
import { QUERY_KEY_AGENT_ID, AGENT_ID_ROUTE } from '../../../common/constants';
import { AgentIdResult } from './tree_nav/types';

export type UseTreeViewProps = {
  globalFilter: GlobalFilter;
  indexPattern?: IndexPattern;
};

export const useTreeView = ({ globalFilter, indexPattern }: UseTreeViewProps) => {
  const [noResults, setNoResults] = useState(false);
  const [treeNavSelection, setTreeNavSelection] = useState<Partial<KubernetesCollectionMap>>({});
  const [hasSelection, setHasSelection] = useState(false);
  const [treeNavResponseActionDisabled, setTreeNavResponseActionDisabled] = useState(false);
  const filterQueryWithTimeRange = useMemo(() => {
    return JSON.parse(
      addTimerangeAndDefaultFilterToQuery(
        globalFilter.filterQuery,
        globalFilter.startDate,
        globalFilter.endDate
      )
    );
  }, [globalFilter.filterQuery, globalFilter.startDate, globalFilter.endDate]);

  const onTreeNavSelect = useCallback((selection: Partial<KubernetesCollectionMap>) => {
    const isResponseActionEnabled =
      !!selection?.node || !!selection?.pod || !!selection?.containerImage;
    setTreeNavResponseActionDisabled(isResponseActionEnabled ? false : true);
    setHasSelection(false);
    setTreeNavSelection(selection);
  }, []);

  const sessionViewFilter = useMemo(
    () => addTreeNavSelectionToFilterQuery(globalFilter.filterQuery, treeNavSelection),
    [globalFilter.filterQuery, treeNavSelection]
  );

  // Resetting defaults whenever filter changes
  useEffect(() => {
    setNoResults(false);
    setTreeNavSelection({});
  }, [filterQueryWithTimeRange]);

  useEffect(() => {
    if (!!treeNavSelection.clusterId) {
      setHasSelection(true);
      setTreeNavSelection(treeNavSelection);
    }
  }, [treeNavSelection]);

  return {
    noResults,
    setNoResults,
    filterQueryWithTimeRange,
    indexPattern: indexPattern?.title || '',
    onTreeNavSelect,
    hasSelection,
    treeNavSelection,
    treeNavResponseActionDisabled,
    sessionViewFilter,
  };
};

export const useFetchAgentIdForResponder = (
  filterQuery: QueryDslQueryContainerBool,
  index?: string
) => {
  const { http } = useKibana<CoreStart>().services;
  const cachingKeys = [QUERY_KEY_AGENT_ID, filterQuery, index];
  const query = useQuery(cachingKeys, async (): Promise<AgentIdResult> => {
    const res = await http.get<AgentIdResult>(AGENT_ID_ROUTE, {
      query: {
        query: JSON.stringify(filterQuery),
        index,
      },
    });

    return res;
  });

  return query;
};
