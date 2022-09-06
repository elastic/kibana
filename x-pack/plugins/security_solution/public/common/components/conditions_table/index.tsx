/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import type { EuiBasicTableProps } from '@elastic/eui';
import { EuiBasicTable, EuiFlexGroup, EuiFlexItem, EuiHideFor } from '@elastic/eui';

import type { AndOr } from '../and_or_badge';
import { AndOrBadge } from '../and_or_badge';

const AndOrBadgeContainer = styled(EuiFlexItem)`
  padding-top: ${({ theme }) => theme.eui.euiSizeXL};
  padding-bottom: ${({ theme }) => theme.eui.euiSizeS};
`;

type ConditionsTableProps<T> = EuiBasicTableProps<T> & {
  badge: AndOr;
};

export const ConditionsTable = <T,>({ badge, ...props }: ConditionsTableProps<T>) => {
  return (
    <EuiFlexGroup direction="row" gutterSize="none">
      {props.items.length > 1 && (
        <EuiHideFor sizes={['xs', 's']}>
          <AndOrBadgeContainer grow={false}>
            <AndOrBadge type={badge} includeAntennas />
          </AndOrBadgeContainer>
        </EuiHideFor>
      )}
      <EuiFlexItem grow={1}>
        <EuiBasicTable {...props} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

ConditionsTable.displayName = 'ConditionsTable';
