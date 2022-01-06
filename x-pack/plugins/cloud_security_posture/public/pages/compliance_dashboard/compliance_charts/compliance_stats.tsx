/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiStat,
  EuiFlexItem,
  EuiPanel,
  EuiIcon,
  EuiFlexGrid,
  EuiText,
  // EuiFlexGroup,
} from '@elastic/eui';
// import { Chart, Settings, LineSeries } from '@elastic/charts';
import type { IconType, EuiStatProps } from '@elastic/eui';
import { useCloudPostureStatsApi } from '../../../common/api';
import { statusColors } from '../../../common/constants';
import { Score } from '../../../../common/types';

// type Trend = Array<[time: number, value: number]>;

// TODO: this is the warning color hash listen in EUI's docs. need to find where to import it from.

const getTitleColor = (value: Score): EuiStatProps['titleColor'] => {
  if (value <= 65) return 'danger';
  if (value <= 95) return statusColors.warning;
  if (value <= 100) return 'success';
  return 'default';
};

const getScoreIcon = (value: Score): IconType => {
  if (value <= 65) return 'alert';
  if (value <= 86) return 'alert';
  if (value <= 100) return 'check';
  return 'error';
};

// TODO: make score trend check for length, cases for less than 2 or more than 5 should be handled
// const getScoreTrendPercentage = (scoreTrend: Trend) => {
//   const beforeLast = scoreTrend[scoreTrend.length - 2][1];
//   const last = scoreTrend[scoreTrend.length - 1][1];
//
//   return Number((last - beforeLast).toFixed(1));
// };

const placeholder = (
  <EuiText size="xs" color="subdued">
    {'No data to display'}
  </EuiText>
);

export const ComplianceStats = () => {
  const getStats = useCloudPostureStatsApi();
  // TODO: add error/loading state
  if (!getStats.isSuccess) return null;
  const { postureScore, benchmarksStats: benchmarks } = getStats.data;

  // TODO: in case we dont have a full length trend we will need to handle the sparkline chart alone. not rendering anything is just a temporary solution
  if (!benchmarks || !postureScore) return null;

  // TODO: mock data, needs BE
  // const scoreTrend = [
  //   [0, 0],
  //   [1, 10],
  //   [2, 100],
  //   [3, 50],
  //   [4, postureScore],
  // ] as Trend;
  //
  // const scoreChange = getScoreTrendPercentage(scoreTrend);
  // const isPositiveChange = scoreChange > 0;

  const stats = [
    {
      title: postureScore,
      description: 'Posture Score',
      titleColor: getTitleColor(postureScore),
      iconType: getScoreIcon(postureScore),
    },
    {
      // TODO: remove placeholder for the commented out component, needs BE
      title: placeholder,
      description: 'Posture Score Trend',
    },
    // {
    //   title: (
    //     <span>
    //       <EuiIcon size="xl" type={isPositiveChange ? 'sortUp' : 'sortDown'} />
    //       {`${scoreChange}%`}
    //     </span>
    //   ),
    //   description: 'Posture Score Trend',
    //   titleColor: isPositiveChange ? 'success' : 'danger',
    //   renderBody: (
    //     <>
    //       <Chart size={{ height: 30 }}>
    //         <Settings
    //           showLegend={false}
    //           tooltip="none"
    //           theme={{
    //             lineSeriesStyle: {
    //               point: {
    //                 visible: false,
    //               },
    //             },
    //           }}
    //         />
    //         <LineSeries
    //           id="posture-score-trend-sparkline"
    //           data={scoreTrend}
    //           xAccessor={0}
    //           yAccessors={[1]}
    //           color={isPositiveChange ? statusColors.success : statusColors.danger}
    //         />
    //       </Chart>
    //     </>
    //   ),
    // },
    {
      // TODO: this should count only ACTIVE benchmarks. needs BE
      title: benchmarks.length,
      description: 'Active Frameworks',
    },
    {
      // TODO: should be relatively simple to return from BE. needs BE
      title: placeholder,
      description: 'Total Resources',
    },
  ];

  return (
    <EuiFlexGrid columns={2}>
      {stats.map((s) => (
        <EuiFlexItem style={{ height: '45%' }}>
          <EuiPanel hasShadow={false} hasBorder>
            <EuiStat
              title={s.title}
              description={s.description}
              textAlign="left"
              titleColor={s.titleColor}
            >
              {
                // s.renderBody ||
                <EuiIcon type={s.iconType || 'empty'} color={s.titleColor} />
              }
            </EuiStat>
          </EuiPanel>
        </EuiFlexItem>
      ))}
    </EuiFlexGrid>
  );
};
