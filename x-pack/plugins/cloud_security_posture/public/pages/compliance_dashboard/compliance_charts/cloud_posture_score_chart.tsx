/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  AreaSeries,
  Axis,
  Chart,
  ElementClickListener,
  niceTimeFormatByDay,
  Partition,
  PartitionElementEvent,
  PartitionLayout,
  Settings,
  timeFormatter,
} from '@elastic/charts';
import { EuiFlexGroup, EuiText, EuiHorizontalRule, EuiFlexItem } from '@elastic/eui';
import { FormattedDate, FormattedTime } from '@kbn/i18n-react';
import moment from 'moment';
import { statusColors } from '../../../common/constants';
import type { PostureTrend, Stats } from '../../../../common/types';
import * as TEXT from '../translations';
import { CompactFormattedNumber } from '../../../components/compact_formatted_number';

interface CloudPostureScoreChartProps {
  trend: PostureTrend[];
  data: Stats;
  id: string;
  partitionOnElementClick: (elements: PartitionElementEvent[]) => void;
}

const getPostureScorePercentage = (postureScore: number): string => `${Math.round(postureScore)}%`;

const ScoreChart = ({
  data: { totalPassed, totalFailed },
  id,
  partitionOnElementClick,
}: Omit<CloudPostureScoreChartProps, 'trend'>) => {
  const data = [
    { label: TEXT.PASSED, value: totalPassed },
    { label: TEXT.FAILED, value: totalFailed },
  ];

  return (
    <Chart size={{ height: 90, width: 90 }}>
      <Settings
        // TODO use the EUI charts theme see src/plugins/charts/public/services/theme/README.md
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
  const percentage = getPostureScorePercentage(postureScore);

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

const convertTrendToEpochTime = (trend: PostureTrend) => ({
  ...trend,
  timestamp: moment(trend.timestamp).valueOf(),
});

const ComplianceTrendChart = ({ trend }: { trend: PostureTrend[] }) => {
  const epochTimeTrend = trend.map(convertTrendToEpochTime);

  return (
    <Chart>
      <Settings
        showLegend={false}
        legendPosition="right"
        tooltip={{
          headerFormatter: ({ value }) => (
            <>
              <FormattedDate value={value} month="short" day="numeric" />
              {', '}
              <FormattedTime value={value} />
            </>
          ),
        }}
      />
      <AreaSeries
        // EuiChart is using this id in the tooltip label
        id="Posture Score"
        data={epochTimeTrend}
        xScaleType="time"
        xAccessor={'timestamp'}
        yAccessors={['postureScore']}
      />
      <Axis id="bottom-axis" position="bottom" tickFormat={timeFormatter(niceTimeFormatByDay(2))} />
      <Axis
        ticks={3}
        id="left-axis"
        position="left"
        showGridLines
        domain={{ min: 0, max: 100 }}
        tickFormat={(rawScore) => getPostureScorePercentage(rawScore)}
      />
    </Chart>
  );
};

export const CloudPostureScoreChart = ({
  data,
  trend,
  id,
  partitionOnElementClick,
}: CloudPostureScoreChartProps) => (
  <EuiFlexGroup direction="column" gutterSize="none">
    <EuiFlexItem grow={4}>
      <EuiFlexGroup direction="row">
        <EuiFlexItem grow={false} style={{ justifyContent: 'center' }}>
          <ScoreChart {...{ id, data, partitionOnElementClick }} />
        </EuiFlexItem>
        <EuiFlexItem>
          <PercentageInfo {...data} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
    <EuiHorizontalRule margin="xs" />
    <EuiFlexItem grow={6}>
      <ComplianceTrendChart trend={trend} />
    </EuiFlexItem>
  </EuiFlexGroup>
);
