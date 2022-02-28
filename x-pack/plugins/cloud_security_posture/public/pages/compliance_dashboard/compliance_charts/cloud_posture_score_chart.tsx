/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  Chart,
  ElementClickListener,
  Partition,
  PartitionElementEvent,
  PartitionLayout,
  Settings,
} from '@elastic/charts';
import { EuiFlexGroup, EuiText, EuiHorizontalRule, EuiFlexItem } from '@elastic/eui';
import { statusColors } from '../../../common/constants';
import type { Stats } from '../../../../common/types';
import * as TEXT from '../translations';
import { CompactFormattedNumber } from '../../../components/compact_formatted_number';

interface CloudPostureScoreChartProps {
  data: Stats;
  id: string;
  partitionOnElementClick: (elements: PartitionElementEvent[]) => void;
}

const ScoreChart = ({
  data: { totalPassed, totalFailed },
  id,
  partitionOnElementClick,
}: CloudPostureScoreChartProps) => {
  const data = [
    { label: TEXT.PASSED, value: totalPassed },
    { label: TEXT.FAILED, value: totalFailed },
  ];

  return (
    <Chart size={{ height: 80, width: 90 }}>
      <Settings
        theme={{
          partition: {
            linkLabel: { maximumSection: Infinity, maxCount: 0 },
            outerSizeRatio: 0.9,
            emptySizeRatio: 0.75,
          },
        }}
        onElementClick={partitionOnElementClick as ElementClickListener}
      />
      <Partition
        id={id}
        data={data}
        valueGetter="percent"
        valueAccessor={(d) => d.value}
        layout={PartitionLayout.sunburst}
        layers={[
          {
            groupByRollup: (d: { label: string }) => d.label,
            shape: {
              fillColor: (d, index) =>
                d.dataName === 'Passed' ? statusColors.success : statusColors.danger,
            },
          },
        ]}
      />
    </Chart>
  );
};

const PercentageInfo = ({
  postureScore,
  totalPassed,
  totalFindings,
}: CloudPostureScoreChartProps['data']) => {
  const percentage = `${Math.round(postureScore)}%`;

  return (
    <EuiFlexGroup direction="column" justifyContent="center">
      <EuiText style={{ fontSize: 40, fontWeight: 'bold', lineHeight: 1 }}>{percentage}</EuiText>
      <EuiText size="xs">
        <CompactFormattedNumber number={totalPassed} />
        {'/'}
        <CompactFormattedNumber number={totalFindings} />
        {' Findings passed'}
      </EuiText>
    </EuiFlexGroup>
  );
};

const ComplianceTrendChart = () => <div>Trend Placeholder</div>;

export const CloudPostureScoreChart = ({
  data,
  id,
  partitionOnElementClick,
}: CloudPostureScoreChartProps) => (
  <EuiFlexGroup direction="column" gutterSize="none">
    <EuiFlexItem grow={4}>
      <EuiFlexGroup direction="row" style={{ margin: 0 }}>
        <EuiFlexItem grow={false} style={{ justifyContent: 'flex-end' }}>
          <ScoreChart {...{ id, data, partitionOnElementClick }} />
        </EuiFlexItem>
        <EuiFlexItem>
          <PercentageInfo {...data} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
    <EuiHorizontalRule margin="m" />
    <EuiFlexItem grow={6}>
      <ComplianceTrendChart />
    </EuiFlexItem>
  </EuiFlexGroup>
);
