/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import {
  EuiFlexGrid,
  EuiFlexItem,
  EuiFlexGroup,
  EuiText,
  EuiTitle,
  EuiIcon,
} from '@elastic/eui';
import styled from 'styled-components';
import { asPercent } from '../../../utils/formatters';

interface TransactionBreakdownKpi {
  name: string;
  percentage: number;
  color: string;
}

interface Props {
  kpis: TransactionBreakdownKpi[];
}

const Description = styled.span`
   {
    white-space: nowrap;
  }
`;

function KpiDescription({ name, color }: { name: string; color: string }) {
  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="s"
      direction="row"
      wrap={false}
    >
      <EuiFlexItem grow={false}>
        <EuiIcon type="dot" color={color} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText color="subdued" size="xs">
          <Description>{name}</Description>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function TransactionBreakdownKpiList({ kpis }: Props) {
  return (
    <EuiFlexGrid>
      {kpis.map((kpi) => (
        <EuiFlexItem key={kpi.name} grow={false}>
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem grow={false}>
              <KpiDescription name={kpi.name} color={kpi.color} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiTitle size="s">
                <span>{asPercent(kpi.percentage, 1)}</span>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      ))}
    </EuiFlexGrid>
  );
}

export { TransactionBreakdownKpiList };
