/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { EuiFieldSearch, EuiFlexItem, EuiText, EuiSpacer } from '@elastic/eui';
import useDebounce from 'react-use/lib/useDebounce';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

interface RulesTableToolbarProps {
  search(value: string): void;
  totalRulesCount: number;
  searchValue: string;
  isSearching: boolean;
  pageSize: number;
}

interface RuleTableCount {
  pageSize: number;
  total: number;
}

export const RulesTableHeader = ({
  search,
  searchValue,
  isSearching,
  totalRulesCount,
  pageSize,
}: RulesTableToolbarProps) => (
  <SearchField
    isSearching={isSearching}
    searchValue={searchValue}
    search={search}
    totalRulesCount={totalRulesCount}
    pageSize={pageSize}
  />
);

const SEARCH_DEBOUNCE_MS = 300;

const SearchField = ({
  search,
  isSearching,
  searchValue,
  totalRulesCount,
  pageSize,
}: Pick<
  RulesTableToolbarProps,
  'isSearching' | 'searchValue' | 'search' | 'totalRulesCount' | 'pageSize'
>) => {
  const [localValue, setLocalValue] = useState(searchValue);

  useDebounce(() => search(localValue), SEARCH_DEBOUNCE_MS, [localValue]);

  return (
    <div>
      <EuiFlexItem grow={true} style={{ alignItems: 'flex-end' }}>
        <EuiFieldSearch
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
      <CurrentPageOfTotal pageSize={pageSize} total={totalRulesCount} />
    </div>
  );
};

const CurrentPageOfTotal = ({ pageSize, total }: RuleTableCount) => (
  <EuiFlexItem grow={true}>
    <EuiSpacer size="xl" />
    <EuiText size="xs" textAlign="left" color="subdued" style={{ marginLeft: '8px' }}>
      <FormattedMessage
        id="xpack.csp.rules.rulesTable.showingPageOfTotalLabel"
        defaultMessage="Showing {pageSize} of of {total, plural, one {# rule} other {# rules}}"
        values={{ pageSize, total }}
      />
    </EuiText>
  </EuiFlexItem>
);
