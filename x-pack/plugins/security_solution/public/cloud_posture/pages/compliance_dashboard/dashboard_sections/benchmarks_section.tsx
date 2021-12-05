/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGrid,
  EuiFlexItem,
  EuiPanel,
  EuiIcon,
  EuiTitle,
  IconType,
  EuiSpacer,
  EuiBadge,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
} from '@elastic/eui';
import { CloudPostureScoreChart } from '../compliance_charts/cloud_posture_score_chart';
import { ComplianceTrendChart } from '../compliance_charts/compliance_trend_chart';
import { useCloudPostureStatsApi } from '../../../common/api/use_cloud_posture_stats_api';

const logoMap: Record<string, IconType> = {
  'CIS Kubernetes': 'logoKubernetes',
};

const getHealthBadge = (value: number) => {
  if (value <= 65) return <EuiBadge color="danger">Critical</EuiBadge>;
  if (value <= 86) return <EuiBadge color="warning">Warning</EuiBadge>;
  if (value <= 100) return <EuiBadge color="success">Healthy</EuiBadge>;
  return 'error';
};

export const BenchmarksSection = () => {
  const getStats = useCloudPostureStatsApi();
  const benchmarks = getStats.isSuccess && getStats.data.benchmarksStats;
  if (!benchmarks) return null;

  return (
    <>
      {benchmarks.map((benchmark) => (
        <EuiPanel hasBorder hasShadow={false}>
          <EuiFlexGrid columns={4}>
            <EuiFlexItem
              style={{
                justifyContent: 'center',
                alignItems: 'center',
                flexBasis: '20%',
                borderRight: `1px solid lightgray`,
              }}
            >
              <EuiIcon type={logoMap[benchmark.name]} size="xxl" />
              <EuiSpacer />
              <EuiTitle size={'s'}>
                <h3>{benchmark.name}</h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem style={{ flexBasis: '20%' }}>
              <EuiDescriptionList>
                <EuiDescriptionListTitle>Compliance Score</EuiDescriptionListTitle>
                <EuiDescriptionListDescription>
                  <CloudPostureScoreChart {...benchmark} />
                </EuiDescriptionListDescription>
              </EuiDescriptionList>
            </EuiFlexItem>
            <EuiFlexItem style={{ flexBasis: '40%' }}>
              <EuiDescriptionList>
                <EuiDescriptionListTitle>Compliance Trend</EuiDescriptionListTitle>
                <EuiDescriptionListDescription>
                  <ComplianceTrendChart {...benchmark} />
                </EuiDescriptionListDescription>
              </EuiDescriptionList>
            </EuiFlexItem>
            <EuiFlexItem style={{ flexBasis: '10%' }}>
              <EuiDescriptionList>
                <EuiDescriptionListTitle>Posture Score</EuiDescriptionListTitle>
                <EuiDescriptionListDescription>
                  {benchmark.postureScore}
                </EuiDescriptionListDescription>
                <EuiDescriptionListTitle>Status</EuiDescriptionListTitle>
                <EuiDescriptionListDescription>
                  {getHealthBadge(benchmark.postureScore)}
                </EuiDescriptionListDescription>
                <EuiDescriptionListTitle>Total Failures</EuiDescriptionListTitle>
                <EuiDescriptionListDescription>
                  {benchmark.totalFailed}
                </EuiDescriptionListDescription>
              </EuiDescriptionList>
              {/* <MiniCPSGoalChart />*/}
            </EuiFlexItem>
          </EuiFlexGrid>
        </EuiPanel>
      ))}
    </>
  );
};
