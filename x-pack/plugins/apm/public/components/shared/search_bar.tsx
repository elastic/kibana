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
import { isMobileAgentName } from '../../../common/agent_name';
import { useApmServiceContext } from '../../context/apm_service/use_apm_service_context';
import { useBreakpoints } from '../../hooks/use_breakpoints';
import { ApmDatePicker } from './date_picker/apm_date_picker';
import { KueryBar } from './kuery_bar';
import { TimeComparison } from './time_comparison';
import { TransactionTypeSelect } from './transaction_type_select';

interface Props {
  hidden?: boolean;
  showKueryBar?: boolean;
  showTimeComparison?: boolean;
  showTransactionTypeSelector?: boolean;
  kueryBarPlaceholder?: string;
  kueryBarBoolFilter?: QueryDslQueryContainer[];
}

export function SearchBar({
  hidden = false,
  showKueryBar = true,
  showTimeComparison = false,
  showTransactionTypeSelector = false,
  kueryBarBoolFilter,
  kueryBarPlaceholder,
}: Props) {
  const { agentName } = useApmServiceContext();
  const isMobileAgent = isMobileAgentName(agentName);

  const { isSmall, isMedium, isLarge, isXl, isXXL, isXXXL } = useBreakpoints();

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

            {showKueryBar && (
              <EuiFlexItem>
                <KueryBar
                  placeholder={kueryBarPlaceholder}
                  boolFilter={kueryBarBoolFilter}
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
            <EuiFlexItem grow={false}>
              <ApmDatePicker />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size={isMobileAgent ? 's' : 'm'} />
    </>
  );
}
