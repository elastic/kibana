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
  EuiDescriptionList,
} from '@elastic/eui';
import { CloudPostureScoreChart } from '../compliance_charts/cloud_posture_score_chart';
import { ComplianceTrendChart } from '../compliance_charts/compliance_trend_chart';
import { useCloudPostureStatsApi } from '../../../common/api/use_cloud_posture_stats_api';
import { CSPHealthBadge } from '../../../components/csp_health_badge';
import { ChartPanel } from '../../../components/chart_panel';

const logoMap: Record<string, IconType> = {
  'CIS Kubernetes': 'logoKubernetes',
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
              <EuiDescriptionList
                listItems={[
                  {
                    title: 'Compliance Score',
                    description: (
                      <ChartPanel
                        hasBorder={false}
                        chart={CloudPostureScoreChart}
                        data={benchmark}
                        isLoading={getStats.isLoading}
                        isError={getStats.isError}
                      />
                    ),
                  },
                ]}
              />
            </EuiFlexItem>
            <EuiFlexItem style={{ flexBasis: '40%' }}>
              <EuiDescriptionList
                listItems={[
                  {
                    title: 'Compliance Trend',
                    description: (
                      <ChartPanel
                        hasBorder={false}
                        chart={ComplianceTrendChart}
                        data={benchmark}
                        isLoading={getStats.isLoading}
                        isError={getStats.isError}
                      />
                    ),
                  },
                ]}
              />
            </EuiFlexItem>
            <EuiFlexItem style={{ flexBasis: '10%' }}>
              <EuiDescriptionList
                listItems={[
                  {
                    title: 'Posture Score',
                    description: benchmark.postureScore || 'error',
                  },
                  {
                    title: 'Status',
                    description:
                      benchmark.postureScore !== undefined ? (
                        <CSPHealthBadge value={benchmark.postureScore} />
                      ) : (
                        'error'
                      ),
                  },
                  {
                    title: 'Total Failures',
                    description: benchmark.totalFailed || 'error',
                  },
                ]}
              />
            </EuiFlexItem>
          </EuiFlexGrid>
        </EuiPanel>
      ))}
    </>
  );
};
