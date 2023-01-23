/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiSelect } from '@elastic/eui';
import type { EuiSelectOption } from '@elastic/eui';

import * as i18n from './translations';
import type { SortOrderType } from './types';

interface FilterActivityProps {
  isLoading?: boolean;
  sortOrder: SortOrderType;
  onOrderChange: (sortOrder: SortOrderType) => void;
}

export const SortOptions: EuiSelectOption[] = [
  {
    value: 'desc',
    text: i18n.NEWEST,
  },
  {
    value: 'asc',
    text: i18n.OLDEST,
  },
];

export const SortActivity = React.memo<FilterActivityProps>(
  ({ sortOrder, onOrderChange, isLoading = false }) => {
    const onChange = useCallback(
      (e) => {
        onOrderChange(e.target.value);
      },
      [onOrderChange]
    );

    return (
      <EuiSelect
        prepend="SortBy"
        data-test-subj="user-actions-sort-select"
        isLoading={isLoading}
        onChange={onChange}
        options={SortOptions}
        value={sortOrder ?? ''}
      />
    );
  }
);

SortActivity.displayName = 'SortActivity';
