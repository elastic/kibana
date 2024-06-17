/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useState, useMemo, useCallback } from 'react';

import { useHistory } from 'react-router-dom';

import type { Agent } from '../../../../types';
import { usePagination, useUrlParams } from '../../../../hooks';

export function useTableState() {
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

  // Status for filtering
  const [selectedStatus, setSelectedStatus] = useState<string[]>([
    'healthy',
    'unhealthy',
    'updating',
    'offline',
  ]);

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

  return {
    showInactive,
    showUpgradeable,
    setShowUpgradeable,
    search,
    setSearch,
    sortField,
    setSortField,
    sortOrder,
    setSortOrder,
    selectedStatus,
    setSelectedStatus,
    pagination,
    pageSizeOptions,
    setPagination,
    draftKuery,
    setDraftKuery,
  };
}
