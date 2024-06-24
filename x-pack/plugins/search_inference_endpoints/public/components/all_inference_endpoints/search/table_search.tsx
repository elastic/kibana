/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldSearch } from '@elastic/eui';
import React, { useCallback } from 'react';
import './table_search.scss';

interface TableSearchComponentProps {
  searchKey: string;
  setSearchKey: React.Dispatch<React.SetStateAction<string>>;
}

const TableSearchComponent: React.FC<TableSearchComponentProps> = ({ searchKey, setSearchKey }) => {
  const onSearch = useCallback(
    (newSearch) => {
      const trimSearch = newSearch.trim();
      setSearchKey(trimSearch);
    },
    [setSearchKey]
  );

  return (
    <EuiFieldSearch
      className="searchField"
      aria-label="Search endpoints"
      placeholder="Search"
      onChange={(e) => setSearchKey(e.target.value)}
      onSearch={onSearch}
      value={searchKey}
      style={{ width: '473px' }}
    />
  );
};

TableSearchComponent.displayName = 'TableSearchComponent';

export const TableSearch = React.memo(TableSearchComponent);
