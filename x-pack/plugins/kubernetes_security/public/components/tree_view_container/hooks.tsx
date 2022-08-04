/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { KubernetesCollection, TreeNavSelection } from '../../types';
import { addTimerangeAndDefaultFilterToQuery } from '../../utils/add_timerange_and_default_filter_to_query';
import { addTreeNavSelectionToFilterQuery } from './helpers';
import { IndexPattern, GlobalFilter } from '../../types';

export type UseTreeViewProps = {
  globalFilter: GlobalFilter;
  indexPattern?: IndexPattern;
};

export const useTreeView = ({ globalFilter, indexPattern }: UseTreeViewProps) => {
  const [noResults, setNoResults] = useState(false);
  const [treeNavSelection, setTreeNavSelection] = useState<TreeNavSelection>({});
  const [hasSelection, setHasSelection] = useState(false);

  const filterQueryWithTimeRange = useMemo(() => {
    return JSON.parse(
      addTimerangeAndDefaultFilterToQuery(
        globalFilter.filterQuery,
        globalFilter.startDate,
        globalFilter.endDate
      )
    );
  }, [globalFilter.filterQuery, globalFilter.startDate, globalFilter.endDate]);

  const onTreeNavSelect = useCallback((selection: TreeNavSelection) => {
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
    if (!!treeNavSelection[KubernetesCollection.clusterId]) {
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
    sessionViewFilter,
  };
};
