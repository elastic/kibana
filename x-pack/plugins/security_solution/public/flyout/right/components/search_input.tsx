/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldSearch } from '@elastic/eui';
import React, { type FC, useState, useCallback } from 'react';
import { useDebounce } from 'react-use';

export interface SearchInputProps {
  onChange: (searchValue: string) => void;
  'data-test-subj'?: string;
}

export const SearchInput: FC<SearchInputProps> = ({ onChange, ...rest }) => {
  const [search, setSearch] = useState('');

  const handleSearch = useCallback(
    (e) => {
      const newSearchValue = e.target.value;
      setSearch(newSearchValue);
      // If search is not empty, onChange will be called by the useDebounce
      if (newSearchValue) {
        return;
      }

      // If search is empty, call onChange immediately. This is to avoid the debounce delay
      onChange(newSearchValue);
    },
    [onChange]
  );

  useDebounce(
    () => {
      // Skip debounced search if search is empty
      if (!search) {
        return;
      }

      onChange(search);
    },
    300,
    [search]
  );

  return (
    <EuiFieldSearch
      placeholder="Filter by Field, Value, or Description..."
      value={search}
      fullWidth
      onChange={handleSearch}
      isClearable
      aria-label="This is a search bar. As you type, the results lower in the page will automatically filter."
      data-test-subj={rest['data-test-subj']}
    />
  );
};
