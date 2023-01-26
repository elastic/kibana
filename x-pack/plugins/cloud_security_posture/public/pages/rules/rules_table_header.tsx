/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { EuiFieldSearch, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import useDebounce from 'react-use/lib/useDebounce';
import { i18n } from '@kbn/i18n';

interface RulesTableToolbarProps {
  search(value: string): void;
  totalRulesCount: number;
  searchValue: string;
  isSearching: boolean;
}

interface CounterProps {
  count: number;
}

export const RulesTableHeader = ({
  search,
  totalRulesCount,
  searchValue,
  isSearching,
}: RulesTableToolbarProps) => (
  <div>
    <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false} wrap>
      <Counters total={totalRulesCount} />
      <SearchField isSearching={isSearching} searchValue={searchValue} search={search} />
    </EuiFlexGroup>
  </div>
);

const Counters = ({ total }: { total: number }) => (
  <EuiFlexItem grow={false} style={{ flexDirection: 'row', fontVariantNumeric: 'tabular-nums' }}>
    <TotalRulesCount count={total} />
  </EuiFlexItem>
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
    <EuiFlexItem grow={true} style={{ alignItems: 'flex-end', maxWidth: 500 }}>
      <EuiFieldSearch
        isLoading={isSearching}
        placeholder={i18n.translate('xpack.csp.rules.rulesTable.searchPlaceholder', {
          defaultMessage: 'Search by rule name',
        })}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        style={{ minWidth: 150 }}
        fullWidth
      />
    </EuiFlexItem>
  );
};

const TotalRulesCount = ({ count }: CounterProps) => (
  <FormattedMessage
    id="xpack.csp.rules.header.totalRulesCount"
    defaultMessage="Showing {rules}"
    values={{ rules: <RulesCountBold count={count} /> }}
  />
);

const RulesCountBold = ({ count }: CounterProps) => (
  <>
    <strong style={{ margin: '0 4px' }}>{count}</strong>
    <FormattedMessage
      id="xpack.csp.rules.header.rulesCountLabel"
      defaultMessage="{count, plural, one { rule} other { rules}}"
      values={{ count }}
    />
  </>
);
