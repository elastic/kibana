/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import {
  EuiStat,
  EuiFlexItem,
  EuiFlexGroup,
  EuiPanel,
  EuiIcon,
  EuiSwitch,
  EuiSpacer,
  EuiFlexGrid,
  euiPaletteForStatus,
  EuiBadge,
} from '@elastic/eui';
import { Chart, Settings, LineSeries } from '@elastic/charts';
import { CspData } from './charts_data_types';
import { dateValueToTuple } from '../index';
import { useCloudPostureStatsApi } from '../../../common/api/use_cloud_posture_stats_api';

const [green, yellow, red] = euiPaletteForStatus(3);

const getScoreVariant = (value: number) => {
  if (value <= 65) return 'danger';
  if (value <= 86) return '#F5A700';
  if (value <= 100) return 'success';
  return 'error';
};

const getIsPositiveChange = (value: number) => value > 0;

const getScoreIcon = (value: number) => {
  if (value <= 65) return 'alert';
  if (value <= 86) return 'alert';
  if (value <= 100) return 'check';
  return 'error';
};

const getHealthBadge = (value: number) => {
  if (value <= 65) return <EuiBadge color="danger">Critical</EuiBadge>;
  if (value <= 86) return <EuiBadge color="warning">Warning</EuiBadge>;
  if (value <= 100) return <EuiBadge color="success">Healthy</EuiBadge>;
  return 'error';
};

const getScoreTrendPercentage = (scoreTrend: any) => {
  const beforeLast = scoreTrend.at(-2)[1];
  const last = scoreTrend.at(-1)[1];

  return (last - beforeLast).toFixed(1);
};

const mock = 20;

export const ComplianceStats = () => {
  const getStats = useCloudPostureStatsApi();
  const postureScore = (getStats.isSuccess && getStats.data.postureScore) || mock;

  const scoreTrend = [
    [0, 0],
    [1, 10],
    [2, 100],
    [3, 50],
    [4, postureScore],
  ];

  const scoreChange = getScoreTrendPercentage(scoreTrend);
  const isPositiveChange = getIsPositiveChange(scoreChange);

  const stats = [
    // {
    //   title: getHealthBadge(postureScore),
    //   description: 'Posture Status',
    // },
    {
      title: postureScore,
      description: 'Posture Score',
      titleColor: getScoreVariant(postureScore),
      iconType: getScoreIcon(postureScore),
    },
    {
      title: (
        <span>
          <EuiIcon size="xl" type={isPositiveChange ? 'sortUp' : 'sortDown'} />
          {scoreChange}%
        </span>
      ),
      description: 'Posture Score Trend',
      titleColor: isPositiveChange ? 'success' : 'danger',
      renderBody: (
        <>
          <Chart size={{ height: 30 }}>
            <Settings
              showLegend={false}
              tooltip="none"
              theme={{
                lineSeriesStyle: {
                  point: {
                    visible: false,
                  },
                },
              }}
            />
            <LineSeries
              data={scoreTrend}
              xAccessor={0}
              yAccessors={[1]}
              color={isPositiveChange ? green : red}
            />
          </Chart>
        </>
      ),
    },
    {
      title: '1',
      description: 'Active Frameworks',
      // titleColor: 'primary',
    },
    {
      title: '1,369',
      description: 'Total Resources',
      // titleColor: 'accent',
    },
  ];

  return (
    <EuiFlexGrid columns={2}>
      {stats.map((s) => (
        <EuiFlexItem style={{ height: '45%' }}>
          <EuiPanel hasShadow={false} hasBorder>
            <StyledEuiStat
              title={s.title}
              description={s.description}
              textAlign="left"
              titleColor={s.titleColor}
            >
              {s.renderBody || <EuiIcon type={s.iconType || 'empty'} color={s.titleColor} />}
            </StyledEuiStat>
          </EuiPanel>
        </EuiFlexItem>
      ))}
    </EuiFlexGrid>
  );
};

const StyledEuiStat = styled(EuiStat)`
  .euiTitle {
    font-weight: 300;
  }
`;
