/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { EuiFieldSearch, EuiFlexItem } from '@elastic/eui';
import useDebounce from 'react-use/lib/useDebounce';
import { i18n } from '@kbn/i18n';

interface RulesTableToolbarProps {
  search(value: string): void;
  totalRulesCount: number;
  searchValue: string;
  isSearching: boolean;
}

export const RulesTableHeader = ({ search, searchValue, isSearching }: RulesTableToolbarProps) => (
  <SearchField isSearching={isSearching} searchValue={searchValue} search={search} />
);

const SEARCH_DEBOUNCE_MS = 300;

const SearchField = ({
  search,
  isSearching,
  searchValue,
}: Pick<RulesTableToolbarProps, 'isSearching' | 'searchValue' | 'search'>) => {
  const [localValue, setLocalValue] = useState(searchValue);

  useDebounce(() => search(localValue), SEARCH_DEBOUNCE_MS, [localValue]);

  return (
    <EuiFlexItem grow={true} style={{ alignItems: 'flex-end' }}>
      <EuiFieldSearch
        data-test-subj="cloudSecurityPostureSearchFieldFieldSearch"
        isLoading={isSearching}
        placeholder={i18n.translate('xpack.csp.rules.rulesTable.searchPlaceholder', {
          defaultMessage: 'Search by Rule Name',
        })}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        style={{ minWidth: 150 }}
        fullWidth
      />
    </EuiFlexItem>
  );
};
