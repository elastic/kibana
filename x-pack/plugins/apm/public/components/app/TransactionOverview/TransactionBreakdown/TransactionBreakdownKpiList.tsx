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
  EuiTitle
} from '@elastic/eui';
import styled from 'styled-components';
import { InfraFormatterType } from '../../../../../../infra/public/lib/lib';
import { FORMATTERS } from '../../../../../../infra/public/utils/formatters';

interface TransactionBreakdownKpi {
  name: string;
  percentage: number;
  count: number;
  color: string;
}

interface Props {
  kpis: TransactionBreakdownKpi[];
}

const Dot = styled.span`
  display: block;
  width: 8px;
  height: 8px;
  border-radius: 4px;
  background-color: ${props => props.color};
`;

const KpiDescription: React.FC<{
  name: string;
  color: string;
}> = ({ name, color }) => {
  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="s"
      direction="row"
      wrap={false}
    >
      <EuiFlexItem grow={false}>
        <Dot color={color} />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText color="subdued" size="xs">
          {name}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const KpiTitle: React.FC<{
  percentage: number;
  count: number;
}> = ({ percentage, count }) => {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      <EuiFlexItem>
        <EuiTitle size="s">
          <span>{FORMATTERS[InfraFormatterType.percent](percentage)}</span>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText color="subdued">
          ({FORMATTERS[InfraFormatterType.number](count)})
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const TransactionBreakdownKpiList: React.FC<Props> = ({ kpis }) => {
  return (
    <EuiFlexGrid>
      {kpis.map(kpi => (
        <EuiFlexItem key={kpi.name}>
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem>
              <KpiDescription name={kpi.name} color={kpi.color} />
            </EuiFlexItem>
            <EuiFlexItem>
              <KpiTitle percentage={kpi.percentage} count={kpi.count} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      ))}
    </EuiFlexGrid>
  );
};

export { TransactionBreakdownKpiList };
