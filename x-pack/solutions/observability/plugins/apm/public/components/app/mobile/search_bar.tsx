/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiFlexGroupProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React from 'react';
import { useBreakpoints } from '../../../hooks/use_breakpoints';
import { TimeComparison } from '../../shared/time_comparison';
import { MobileFilters } from './service_overview/filters';
import { UnifiedSearchBar } from '../../shared/unified_search_bar';

interface Props {
  hidden?: boolean;
  showUnifiedSearchBar?: boolean;
  showTimeComparison?: boolean;
  showTransactionTypeSelector?: boolean;
  showQueryInput?: boolean;
  showMobileFilters?: boolean;
  searchBarPlaceholder?: string;
}

export function MobileSearchBar({
  hidden = false,
  showUnifiedSearchBar = true,
  showTimeComparison = false,
  showTransactionTypeSelector = false,
  showQueryInput = true,
  showMobileFilters = false,
  searchBarPlaceholder,
}: Props) {
  const { isSmall, isMedium, isLarge, isXl, isXXXL } = useBreakpoints();

  if (hidden) {
    return null;
  }

  const searchBarDirection: EuiFlexGroupProps['direction'] =
    isXXXL || (!isXl && !showTimeComparison) ? 'row' : 'column';

  return (
    <>
      <EuiFlexGroup gutterSize="s" responsive={false} direction={searchBarDirection}>
        <EuiFlexGroup
          direction={isLarge ? 'columnReverse' : 'row'}
          gutterSize="s"
          responsive={false}
        >
          {showUnifiedSearchBar && (
            <EuiFlexItem>
              <UnifiedSearchBar
                placeholder={searchBarPlaceholder}
                showQueryInput={showQueryInput}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiFlexGroup
        justifyContent="spaceBetween"
        gutterSize={isMedium ? 's' : 'm'}
        direction={isLarge || isMedium ? 'column' : 'row'}
      >
        {showTimeComparison && (
          <EuiFlexItem grow={isSmall}>
            <TimeComparison />
          </EuiFlexItem>
        )}
        {showMobileFilters && (
          <EuiFlexItem style={{ minWidth: 300 }}>
            <MobileFilters />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
    </>
  );
}
