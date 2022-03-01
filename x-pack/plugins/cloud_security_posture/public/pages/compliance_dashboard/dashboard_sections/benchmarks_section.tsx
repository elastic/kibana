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
  EuiSpacer,
  EuiDescriptionList,
} from '@elastic/eui';
import { EuiIconType } from '@elastic/eui/src/components/icon/icon';
import { Query } from '@kbn/es-query';
import { useHistory } from 'react-router-dom';
import { PartitionElementEvent } from '@elastic/charts';
import { CloudPostureScoreChart } from '../compliance_charts/cloud_posture_score_chart';
import { ComplianceTrendChart } from '../compliance_charts/compliance_trend_chart';
import { useCloudPostureStatsApi } from '../../../common/api/use_cloud_posture_stats_api';
import { CspHealthBadge } from '../../../components/csp_health_badge';
import { ChartPanel } from '../../../components/chart_panel';
import * as TEXT from '../translations';
import { allNavigationItems } from '../../../common/navigation/constants';
import { encodeQuery } from '../../../common/navigation/query_utils';
import { Evaluation } from '../../../../common/types';

const logoMap: ReadonlyMap<string, EuiIconType> = new Map([['CIS Kubernetes', 'logoKubernetes']]);

const getBenchmarkLogo = (benchmarkName: string): EuiIconType => {
  return logoMap.get(benchmarkName) ?? 'logoElastic';
};

const getBenchmarkEvaluationQuery = (name: string, evaluation: Evaluation): Query => ({
  language: 'kuery',
  query: `rule.benchmark : "${name}" and result.evaluation : "${evaluation}"`,
});

export const BenchmarksSection = () => {
  const history = useHistory();
  const getStats = useCloudPostureStatsApi();
  const benchmarks = getStats.isSuccess && getStats.data.benchmarksStats;
  if (!benchmarks) return null;

  const handleElementClick = (name: string, elements: PartitionElementEvent[]) => {
    const [element] = elements;
    const [layerValue] = element;
    const rollupValue = layerValue[0].groupByRollup as Evaluation;

    history.push({
      pathname: allNavigationItems.findings.path,
      search: encodeQuery(getBenchmarkEvaluationQuery(name, rollupValue)),
    });
  };

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
              <EuiIcon type={getBenchmarkLogo(benchmark.name)} size="xxl" />
              <EuiSpacer />
              <EuiTitle size={'s'}>
                <h3>{benchmark.name}</h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem style={{ flexBasis: '20%' }}>
              <EuiDescriptionList
                listItems={[
                  {
                    // TODO: this shows the failed/passed ratio and not the calculated score. needs product
                    title: TEXT.COMPLIANCE_SCORE,
                    description: (
                      <ChartPanel
                        hasBorder={false}
                        isLoading={getStats.isLoading}
                        isError={getStats.isError}
                      >
                        <CloudPostureScoreChart
                          id={`${benchmark.name}_score_chart`}
                          data={benchmark}
                          partitionOnElementClick={(elements) =>
                            handleElementClick(benchmark.name, elements)
                          }
                        />
                      </ChartPanel>
                    ),
                  },
                ]}
              />
            </EuiFlexItem>
            <EuiFlexItem style={{ flexBasis: '40%' }}>
              <EuiDescriptionList
                listItems={[
                  {
                    title: TEXT.COMPLIANCE_TREND,
                    description: (
                      <ChartPanel
                        hasBorder={false}
                        isLoading={getStats.isLoading}
                        isError={getStats.isError}
                      >
                        {/* TODO: no api for this chart yet, using empty state for now. needs BE */}
                        <ComplianceTrendChart />
                      </ChartPanel>
                    ),
                  },
                ]}
              />
            </EuiFlexItem>
            <EuiFlexItem style={{ flexBasis: '10%' }}>
              <EuiDescriptionList
                listItems={[
                  {
                    title: TEXT.POSTURE_SCORE,
                    // TODO: temporary until the type for this are fixed and the score is no longer optional (right now can fail if score equals 0).
                    description: benchmark.postureScore || 'error',
                  },
                  {
                    title: TEXT.STATUS,
                    description:
                      benchmark.postureScore !== undefined ? (
                        <CspHealthBadge value={benchmark.postureScore} />
                      ) : (
                        TEXT.ERROR
                      ),
                  },
                  {
                    title: TEXT.TOTAL_FAILURES,
                    description: benchmark.totalFailed || TEXT.ERROR,
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
