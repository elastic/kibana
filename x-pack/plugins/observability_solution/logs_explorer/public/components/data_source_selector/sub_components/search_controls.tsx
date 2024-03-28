/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonGroup, EuiFieldSearch, EuiFlexGroup, EuiPanel } from '@elastic/eui';
import { SortOrder } from '../../../../common/latest';
import { sortOptions, sortOrdersLabel } from '../constants';
import { DataSourceSelectorSearchHandler, DataSourceSelectorSearchParams } from '../types';

interface SearchControlsProps {
  isLoading?: boolean;
  onSearch: DataSourceSelectorSearchHandler;
  onSort?: DataSourceSelectorSearchHandler;
  search: DataSourceSelectorSearchParams;
  filterComponent?: React.ReactNode;
}

export const SearchControls = ({
  search,
  onSearch,
  onSort,
  isLoading = false,
  filterComponent,
}: SearchControlsProps) => {
  const handleNameChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const newSearch = {
      ...search,
      name: event.target.value,
    };
    onSearch(newSearch);
  };

  return (
    <EuiPanel
      paddingSize="s"
      hasShadow={false}
      css={{ width: '100%' }}
      data-test-subj="dataSourceSelectorSearchControls"
    >
      <EuiFlexGroup gutterSize="s" direction="column">
        <EuiFlexGroup gutterSize="xs" responsive={false}>
          <EuiFieldSearch
            data-test-subj="logsExplorerSearchControlsFieldSearch"
            compressed
            incremental
            fullWidth
            value={search.name}
            onChange={handleNameChange}
            isLoading={isLoading}
          />
          {onSort && (
            <EuiButtonGroup
              isIconOnly
              buttonSize="compressed"
              options={sortOptions}
              legend={sortOrdersLabel}
              idSelected={search.sortOrder as SortOrder}
              onChange={(id: string) =>
                onSort({
                  ...search,
                  sortOrder: id as DataSourceSelectorSearchParams['sortOrder'],
                })
              }
            />
          )}
        </EuiFlexGroup>
        {filterComponent}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
