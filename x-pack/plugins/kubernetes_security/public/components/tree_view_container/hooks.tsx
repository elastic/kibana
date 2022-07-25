/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { KubernetesCollection, TreeNavSelection } from '../../types';
import { addTimerangeToQuery } from '../../utils/add_timerange_to_query';
import { addTreeNavSelectionToFilterQuery } from './helpers';
import { IndexPattern, GlobalFilter } from '../../types';

export type UseTreeViewProps = {
  globalFilter: GlobalFilter;
  indexPattern?: IndexPattern;
};

export const useTreeView = ({ globalFilter, indexPattern }: UseTreeViewProps) => {
  const [noResults, setNoResults] = useState(false);
  const [treeNavSelection, setTreeNavSelection] = useState<TreeNavSelection>({});

  const filterQueryWithTimeRange = useMemo(() => {
    return JSON.parse(
      addTimerangeToQuery(globalFilter.filterQuery, globalFilter.startDate, globalFilter.endDate)
    );
  }, [globalFilter.filterQuery, globalFilter.startDate, globalFilter.endDate]);

  const onTreeNavSelect = useCallback((selection: TreeNavSelection) => {
    setTreeNavSelection(selection);
  }, []);

  const hasSelection = useMemo(
    () => !!treeNavSelection[KubernetesCollection.cluster],
    [treeNavSelection]
  );

  const sessionViewFilter = useMemo(
    () => addTreeNavSelectionToFilterQuery(globalFilter.filterQuery, treeNavSelection),
    [globalFilter.filterQuery, treeNavSelection]
  );

  // Resetting defaults whenever filter changes
  useEffect(() => {
    setNoResults(false);
    setTreeNavSelection({});
  }, [filterQueryWithTimeRange]);

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
