/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFilterGroup, EuiFilterButton } from '@elastic/eui';

import * as i18n from './translations';
import type { FilterType } from './types';

interface FilterActivityProps {
  type: FilterType;
  onFilterChange: (type: FilterType) => void;
}

export const FilterActivity = React.memo<FilterActivityProps>(({ type, onFilterChange }) => {
  const handleFilterChange = useCallback(
    (value: FilterType) => {
      onFilterChange(value);
    },
    [onFilterChange]
  );

  return (
    <EuiFilterGroup>
      <EuiFilterButton
        withNext
        grow={false}
        numFilters={100}
        onClick={() => handleFilterChange('all')}
        hasActiveFilters={type === 'all'}
      >
        {i18n.ALL}
      </EuiFilterButton>
      <EuiFilterButton
        withNext
        grow={false}
        numFilters={50}
        hasActiveFilters={type === 'user'}
        onClick={() => handleFilterChange('user')}
      >
        {i18n.COMMENTS}
      </EuiFilterButton>
      <EuiFilterButton
        numFilters={50}
        hasActiveFilters={type === 'action'}
        onClick={() => handleFilterChange('action')}
      >
        {i18n.ACTIONS}
      </EuiFilterButton>
    </EuiFilterGroup>
  );
});

FilterActivity.displayName = 'FilterActivity';
