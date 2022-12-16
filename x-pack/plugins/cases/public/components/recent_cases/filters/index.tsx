/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSuperSelectOption } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiSuperSelect, EuiText } from '@elastic/eui';
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

const caseFilterOptions: RecentCasesFilterOptions[] = [
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
  const options: Array<EuiSuperSelectOption<string>> = caseFilterOptions.map((option) => {
    return {
      value: option.id,
      inputDisplay: (
        <EuiFlexGroup
          gutterSize="xs"
          alignItems={'center'}
          responsive={false}
          data-test-subj={`recent-cases-filter-${option.id}`}
        >
          <EuiFlexItem grow={false}>
            <EuiText size="s">{option.label}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    };
  });

  const onChange = useCallback(
    (filterMode: string) => {
      setFilterBy(filterMode as FilterMode);
    },
    [setFilterBy]
  );

  return (
    <EuiSuperSelect
      disabled={!hasCurrentUserInfo}
      fullWidth={true}
      isLoading={isLoading}
      options={options}
      valueOfSelected={filterBy}
      onChange={onChange}
      data-test-subj="recent-cases-filter"
    />
  );
});

RecentCasesFilters.displayName = 'RecentCasesFilters';
