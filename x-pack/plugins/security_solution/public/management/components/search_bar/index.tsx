/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFieldSearch, EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface SearchBarProps {
  defaultValue?: string;
  onSearch(value: string): void;
}

export const SearchBar = memo<SearchBarProps>(({ defaultValue = '', onSearch }) => {
  const [query, setQuery] = useState<string>(defaultValue);

  const handleOnChangeSearchField = useCallback(
    (ev: React.ChangeEvent<HTMLInputElement>) => setQuery(ev.target.value),
    [setQuery]
  );
  const handleOnSearch = useCallback(() => onSearch(query), [query, onSearch]);

  return (
    <EuiFlexGroup direction="row" alignItems="center" gutterSize="l">
      <EuiFlexItem>
        <EuiFieldSearch
          defaultValue={defaultValue}
          placeholder={i18n.translate('xpack.securitySolution.management.search.placeholder', {
            defaultMessage: 'Search',
          })}
          onChange={handleOnChangeSearchField}
          onSearch={onSearch}
          isClearable
          fullWidth
          data-test-subj="searchField"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false} onClick={handleOnSearch} data-test-subj="searchButton">
        <EuiButton iconType="refresh">
          {i18n.translate('xpack.securitySolution.management.search.button', {
            defaultMessage: 'Refresh',
          })}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

SearchBar.displayName = 'SearchBar';
