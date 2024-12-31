/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexGroupProps, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React from 'react';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { useBreakpoints } from '../../../hooks/use_breakpoints';
import { TimeComparison } from '../time_comparison';
import { TransactionTypeSelect } from '../transaction_type_select';
import { UnifiedSearchBar } from '../unified_search_bar';

interface Props {
  hidden?: boolean;
  showUnifiedSearchBar?: boolean;
  showTimeComparison?: boolean;
  showQueryInput?: boolean;
  showTransactionTypeSelector?: boolean;
  searchBarPlaceholder?: string;
  searchBarBoolFilter?: QueryDslQueryContainer[];
}

export function SearchBar({
  hidden = false,
  showUnifiedSearchBar = true,
  showTimeComparison = false,
  showTransactionTypeSelector = false,
  showQueryInput = true,
  searchBarPlaceholder,
  searchBarBoolFilter,
}: Props) {
  const { isSmall, isMedium, isLarge, isXl, isXXL, isXXXL } = useBreakpoints();

  if (hidden) {
    return null;
  }

  const searchBarDirection: EuiFlexGroupProps['direction'] =
    isXXXL || (!isXl && !showTimeComparison) ? 'row' : 'column';

  return (
    <EuiFlexItem grow={false}>
      <EuiFlexGroup gutterSize="s" responsive={false} direction={searchBarDirection}>
        <EuiFlexItem>
          <EuiFlexGroup
            direction={isLarge ? 'columnReverse' : 'row'}
            gutterSize="s"
            responsive={false}
          >
            {showTransactionTypeSelector && (
              <EuiFlexItem grow={false}>
                <TransactionTypeSelect />
              </EuiFlexItem>
            )}

            {showUnifiedSearchBar && (
              <EuiFlexItem>
                <UnifiedSearchBar
                  placeholder={searchBarPlaceholder}
                  boolFilter={searchBarBoolFilter}
                  showQueryInput={showQueryInput}
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={showTimeComparison && !isXXXL}>
          <EuiFlexGroup
            direction={isSmall || isMedium || isLarge ? 'columnReverse' : 'row'}
            justifyContent={isXXL ? 'flexEnd' : undefined}
            gutterSize="s"
            responsive={false}
          >
            {showTimeComparison && (
              <EuiFlexItem grow={isXXXL} style={{ minWidth: 300 }}>
                <TimeComparison />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
    </EuiFlexItem>
  );
}
