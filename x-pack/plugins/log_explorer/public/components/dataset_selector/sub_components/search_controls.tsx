/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonGroup, EuiFieldSearch, EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { SortOrder } from '../../../../common/latest';
import { DATA_VIEW_POPOVER_CONTENT_WIDTH, sortOptions, sortOrdersLabel } from '../constants';
import { DatasetsSelectorSearchHandler, DatasetsSelectorSearchParams } from '../types';

interface SearchControlsProps {
  isLoading: boolean;
  onSearch: DatasetsSelectorSearchHandler;
  onSort: DatasetsSelectorSearchHandler;
  search: DatasetsSelectorSearchParams;
}

export const SearchControls = ({ search, onSearch, onSort, isLoading }: SearchControlsProps) => {
  const handleNameChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const newSearch = {
      ...search,
      name: event.target.value,
    };
    onSearch(newSearch);
  };

  const handleSortChange = (id: string) => {
    const newSearch = { ...search, sortOrder: id as DatasetsSelectorSearchParams['sortOrder'] };
    onSort(newSearch);
  };

  return (
    <EuiPanel
      paddingSize="s"
      hasShadow={false}
      css={{ width: DATA_VIEW_POPOVER_CONTENT_WIDTH }}
      data-test-subj="datasetSelectorSearchControls"
    >
      <EuiFlexGroup gutterSize="xs" responsive={false}>
        <EuiFlexItem>
          <EuiFieldSearch
            compressed
            incremental
            value={search.name}
            onChange={handleNameChange}
            isLoading={isLoading}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            isIconOnly
            buttonSize="compressed"
            options={sortOptions}
            legend={sortOrdersLabel}
            idSelected={search.sortOrder as SortOrder}
            onChange={handleSortChange}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
