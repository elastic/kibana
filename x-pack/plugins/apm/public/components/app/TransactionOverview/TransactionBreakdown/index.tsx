/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import theme from '@elastic/eui/dist/eui_theme_light.json';
import React, { useState, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { sortBy } from 'lodash';
import { useTransactionBreakdown } from '../../../../hooks/useTransactionBreakdown';
import { TransactionBreakdownHeader } from './TransactionBreakdownHeader';
import { TransactionBreakdownKpiList } from './TransactionBreakdownKpiList';
import { TransactionBreakdownGraph } from './TransactionBreakdownGraph';

const COLORS = [
  theme.euiColorVis0,
  theme.euiColorVis1,
  theme.euiColorVis2,
  theme.euiColorVis3,
  theme.euiColorVis4,
  theme.euiColorVis5,
  theme.euiColorVis6,
  theme.euiColorVis7,
  theme.euiColorVis8,
  theme.euiColorVis9
];

const TransactionBreakdown: React.FC<{
  serviceName: string;
  start: string | undefined;
  end: string | undefined;
}> = ({ serviceName, start, end }) => {
  const [showChart, setShowChart] = useState(false);

  const { data } = useTransactionBreakdown({ serviceName, start, end });

  const kpis = useMemo(
    () => {
      return data
        ? sortBy(data, 'name').map((breakdown, index) => {
            return {
              ...breakdown,
              color: COLORS[index % COLORS.length]
            };
          })
        : null;
    },
    [data]
  );
  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem grow={false}>
        <TransactionBreakdownHeader
          showChart={showChart}
          onToggleClick={() => {
            setShowChart(!showChart);
          }}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        {kpis && <TransactionBreakdownKpiList kpis={kpis} />}
      </EuiFlexItem>
      {showChart ? (
        <EuiFlexItem>
          <TransactionBreakdownGraph />
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};

export { TransactionBreakdown };
