/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldSearch } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import * as i18n from './translations';
import type { FilterOptions } from '../../containers/types';

interface TableSearchComponentProps {
  filterOptionsSearch: string;
  onFilterOptionsChange: (filterOptions: Partial<FilterOptions>) => void;
}

const TableSearchComponent: React.FC<TableSearchComponentProps> = ({
  filterOptionsSearch,
  onFilterOptionsChange,
}) => {
  const [search, setSearch] = useState(filterOptionsSearch);

  const onSearch = useCallback(
    (newSearch) => {
      const trimSearch = newSearch.trim();
      setSearch(trimSearch);
      onFilterOptionsChange({ search: trimSearch });
    },
    [onFilterOptionsChange]
  );

  return (
    <EuiFieldSearch
      aria-label={i18n.SEARCH_CASES}
      data-test-subj="search-cases"
      fullWidth
      incremental={false}
      placeholder={i18n.SEARCH_PLACEHOLDER}
      onChange={(e) => setSearch(e.target.value)}
      onSearch={onSearch}
      value={search}
    />
  );
};

TableSearchComponent.displayName = 'TableSearchComponent';

export const TableSearch = React.memo(TableSearchComponent);
