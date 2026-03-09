/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useCallback, useRef, useState } from 'react';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { useBreakpoints } from '../../../hooks/use_breakpoints';
import { ApmDatePicker } from '../date_picker/apm_date_picker';
import { ApmEnvironmentFilter } from '../environment_filter';
import { TimeComparison } from '../time_comparison';
import { TransactionTypeSelect } from '../transaction_type_select';
import { UnifiedSearchBar } from '../unified_search_bar';

interface Props {
  hidden?: boolean;
  showUnifiedSearchBar?: boolean;
  showTimeComparison?: boolean;
  showEnvironmentFilter?: boolean;
  showQueryInput?: boolean;
  showTransactionTypeSelector?: boolean;
  searchBarPlaceholder?: string;
  searchBarBoolFilter?: QueryDslQueryContainer[];
}

export function SearchBar({
  hidden = false,
  showUnifiedSearchBar = true,
  showTimeComparison = false,
  showEnvironmentFilter = false,
  showTransactionTypeSelector = false,
  showQueryInput = true,
  searchBarPlaceholder,
  searchBarBoolFilter,
}: Props) {
  const { isMedium } = useBreakpoints();
  const [isQueryDirty, setIsQueryDirty] = useState(false);
  const [pendingKuery, setPendingKuery] = useState<string | undefined>();
  const submitActionRef = useRef<() => void>();
  const handleDirtyStateChange = useCallback((isDirty: boolean, draftKuery?: string) => {
    setIsQueryDirty(isDirty);
    setPendingKuery(draftKuery);
  }, []);

  if (hidden) {
    return null;
  }

  return (
    <EuiFlexItem>
      <EuiFlexGroup
        gutterSize="s"
        direction={isMedium ? 'column' : 'row'}
        alignItems={isMedium ? 'stretch' : 'center'}
        justifyContent="spaceBetween"
        wrap={!isMedium}
      >
        {showTransactionTypeSelector && (
          <EuiFlexItem grow={false}>
            <TransactionTypeSelect
              compressed
              fullWidth={isMedium}
              cssOverride={!isMedium ? { minWidth: 0, maxWidth: '125px' } : undefined}
            />
          </EuiFlexItem>
        )}

        {showUnifiedSearchBar && (
          <EuiFlexItem>
            <UnifiedSearchBar
              placeholder={searchBarPlaceholder}
              boolFilter={searchBarBoolFilter}
              showQueryInput={showQueryInput}
              showDatePicker={false}
              showSubmitButton={false}
              onDirtyStateChange={handleDirtyStateChange}
              submitActionRef={submitActionRef}
            />
          </EuiFlexItem>
        )}

        <EuiFlexItem grow={false} style={{ minWidth: 0 }}>
          <EuiFlexGroup
            gutterSize="s"
            direction={isMedium ? 'column' : 'row'}
            alignItems={isMedium ? 'stretch' : 'center'}
            wrap={!isMedium}
          >
            {showEnvironmentFilter && (
              <EuiFlexItem grow={false}>
                <ApmEnvironmentFilter
                  compressed
                  hideLabel={!isMedium}
                  fullWidth={isMedium}
                  cssOverride={
                    isMedium
                      ? undefined
                      : {
                          minWidth: 0,
                          maxWidth: '150px',
                        }
                  }
                />
              </EuiFlexItem>
            )}

            {showTimeComparison && (
              <EuiFlexItem grow={false}>
                <TimeComparison compressed />
              </EuiFlexItem>
            )}

            <EuiFlexItem grow={false} style={{ flexShrink: 0 }}>
              <ApmDatePicker
                compressed
                pendingKuery={pendingKuery}
                submitActionRef={submitActionRef}
                updateButtonProps={{
                  fill: false,
                  'data-test-subj': 'querySubmitButton',
                  ...(isQueryDirty && { needsUpdate: true, showTooltip: false }),
                }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
}
