/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  EuiFlexGroup,
  EuiFlexGroupProps,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import React from 'react';
import { useBreakpoints } from '../../../hooks/use_breakpoints';
import { ApmDatePicker } from '../../shared/date_picker/apm_date_picker';
import { KueryBar } from '../../shared/kuery_bar';
import { TimeComparison } from '../../shared/time_comparison';
import { TransactionTypeSelect } from '../../shared/transaction_type_select';
import { MobileFilters } from './service_overview/filters';

interface Props {
  hidden?: boolean;
  showKueryBar?: boolean;
  showTimeComparison?: boolean;
  showTransactionTypeSelector?: boolean;
  showMobileFilters?: boolean;
  kueryBarPlaceholder?: string;
  kueryBarBoolFilter?: QueryDslQueryContainer[];
}

export function MobileSearchBar({
  hidden = false,
  showKueryBar = true,
  showTimeComparison = false,
  showTransactionTypeSelector = false,
  showMobileFilters = false,
  kueryBarBoolFilter,
  kueryBarPlaceholder,
}: Props) {
  const { isSmall, isMedium, isLarge, isXl, isXXXL } = useBreakpoints();

  if (hidden) {
    return null;
  }

  const searchBarDirection: EuiFlexGroupProps['direction'] =
    isXXXL || (!isXl && !showTimeComparison) ? 'row' : 'column';

  return (
    <>
      <EuiFlexGroup
        gutterSize="s"
        responsive={false}
        direction={searchBarDirection}
      >
        <EuiFlexGroup
          direction={isLarge ? 'columnReverse' : 'row'}
          gutterSize="s"
          responsive={false}
        >
          {showTransactionTypeSelector && (
            <EuiFlexItem grow={isSmall}>
              <TransactionTypeSelect />
            </EuiFlexItem>
          )}

          {showKueryBar && (
            <EuiFlexItem>
              <KueryBar
                placeholder={kueryBarPlaceholder}
                boolFilter={kueryBarBoolFilter}
              />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={isSmall}>
            <ApmDatePicker />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
      <EuiSpacer size={isSmall ? 's' : 'm'} />
      <EuiFlexGroup
        justifyContent="spaceBetween"
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
    </>
  );
}
