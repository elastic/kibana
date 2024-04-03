/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectOption } from '@elastic/eui';
import { EuiSelect } from '@elastic/eui';
import React, { useCallback } from 'react';

import type { FilterMode } from '../types';

import * as i18n from '../translations';

interface RecentCasesFilterOptions {
  id: string;
  label: string;
}

const MY_RECENTLY_CREATED_ID = 'recentlyCreated';
const MY_RECENTLY_REPORTED_ID = 'myRecentlyReported';
const MY_RECENTLY_ASSIGNED_ID = 'myRecentlyAssigned';

export const caseFilterOptions: RecentCasesFilterOptions[] = [
  {
    id: MY_RECENTLY_CREATED_ID,
    label: i18n.RECENTLY_CREATED_CASES,
  },
  {
    id: MY_RECENTLY_REPORTED_ID,
    label: i18n.MY_RECENTLY_REPORTED_CASES,
  },
  {
    id: MY_RECENTLY_ASSIGNED_ID,
    label: i18n.MY_RECENTLY_ASSIGNED_CASES,
  },
];

export const RecentCasesFilters = React.memo<{
  filterBy: FilterMode;
  setFilterBy: (filterBy: FilterMode) => void;
  hasCurrentUserInfo: boolean;
  isLoading?: boolean;
}>(({ filterBy, setFilterBy, hasCurrentUserInfo, isLoading = false }) => {
  const options: EuiSelectOption[] = caseFilterOptions.map((option) => {
    return {
      value: option.id,
      text: option.label,
    };
  });

  const onChange = useCallback(
    (e) => {
      setFilterBy(e.target.value as FilterMode);
    },
    [setFilterBy]
  );

  return (
    <EuiSelect
      data-test-subj="recent-cases-filter"
      disabled={!hasCurrentUserInfo}
      fullWidth
      hasNoInitialSelection
      isLoading={isLoading}
      onChange={onChange}
      options={options}
      value={filterBy}
      aria-label={i18n.RECENT_CASES}
    />
  );
});

RecentCasesFilters.displayName = 'RecentCasesFilters';
