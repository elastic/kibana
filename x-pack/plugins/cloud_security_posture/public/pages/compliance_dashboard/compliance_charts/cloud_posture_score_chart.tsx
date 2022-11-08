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
  niceTimeFormatByDay,
  PartitionElementEvent,
  Settings,
  timeFormatter,
} from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiText, EuiTextProps, EuiTitle } from '@elastic/eui';
import { FormattedDate, FormattedTime } from '@kbn/i18n-react';
import moment from 'moment';
import { CompactFormattedNumber } from '../../../components/compact_formatted_number';
import type { PostureTrend, Stats } from '../../../../common/types';
import { useKibana } from '../../../common/hooks/use_kibana';

interface CloudPostureScoreChartProps {
  compact?: boolean;
  trend: PostureTrend[];
  data: Stats;
  id: string;
  partitionOnElementClick: (elements: PartitionElementEvent[]) => void;
}

const getPostureScorePercentage = (postureScore: number): string => `${Math.round(postureScore)}%`;

const PercentageInfo = ({
  compact,
  postureScore,
  totalPassed,
  totalFindings,
}: CloudPostureScoreChartProps['data'] & { compact: CloudPostureScoreChartProps['compact'] }) => {
  const percentage = getPostureScorePercentage(postureScore);

  return (
    <EuiTitle css={{ fontSize: compact ? 22 : 42 }}>
      <h3>{percentage}</h3>
    </EuiTitle>
  );
};

const convertTrendToEpochTime = (trend: PostureTrend) => ({
  ...trend,
  timestamp: moment(trend.timestamp).valueOf(),
});

const ComplianceTrendChart = ({ trend }: { trend: PostureTrend[] }) => {
  const epochTimeTrend = trend.map(convertTrendToEpochTime);
  const {
    services: { charts },
  } = useKibana();

  return (
    <Chart>
      <Settings
        theme={charts.theme.useChartsTheme()}
        baseTheme={charts.theme.useChartsBaseTheme()}
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
      <Axis
        id="bottom-axis"
        position="bottom"
        tickFormat={timeFormatter(niceTimeFormatByDay(2))}
        ticks={4}
      />
      <Axis ticks={3} id="left-axis" position="left" showGridLines domain={{ min: 0, max: 100 }} />
    </Chart>
  );
};

const CounterLink = ({
  text,
  count,
  color,
}: {
  count: number;
  text: string;
  color: EuiTextProps['color'];
}) => (
  <EuiLink color="text" css={{ display: 'flex' }}>
    <EuiText color={color} style={{ fontWeight: 500 }} size="s">
      <CompactFormattedNumber number={count} abbreviateAbove={999} />
      &nbsp;
    </EuiText>
    <EuiText size="s">{text}</EuiText>
  </EuiLink>
);

export const CloudPostureScoreChart = ({
  data,
  trend,
  id,
  partitionOnElementClick,
  compact,
}: CloudPostureScoreChartProps) => (
  <EuiFlexGroup
    direction="column"
    justifyContent="spaceBetween"
    style={{ height: '100%' }}
    gutterSize="none"
  >
    <EuiFlexItem grow={2}>
      <EuiFlexGroup direction="row" justifyContent="spaceBetween">
        <EuiFlexItem>
          <PercentageInfo {...data} compact={compact} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup
            justifyContent="flexEnd"
            alignItems={compact ? 'center' : 'flexStart'}
            style={{ paddingRight: 42 }}
          >
            <CounterLink text="passed" count={data.totalPassed} color="success" />
            &nbsp;{`-`}&nbsp;
            <CounterLink text="failed" count={data.totalFailed} color="danger" />
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
    <EuiFlexItem grow={compact ? 8 : 6}>
      <ComplianceTrendChart trend={trend} />
    </EuiFlexItem>
  </EuiFlexGroup>
);
