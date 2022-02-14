/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexItem,
  EuiPanel,
  EuiIcon,
  EuiSpacer,
  EuiFlexGroup,
  EuiText,
  EuiButtonEmpty,
  useEuiTheme,
} from '@elastic/eui';
import { EuiIconType } from '@elastic/eui/src/components/icon/icon';
import { Query } from '@kbn/es-query';
import { useHistory } from 'react-router-dom';
import { PartitionElementEvent } from '@elastic/charts';
import { EuiThemeComputed } from '@elastic/eui/src/services/theme/types';
import { CloudPostureScoreChart } from '../compliance_charts/cloud_posture_score_chart';
import { useCloudPostureStatsApi } from '../../../common/api/use_cloud_posture_stats_api';
import { ChartPanel } from '../../../components/chart_panel';
import * as TEXT from '../translations';
import { allNavigationItems } from '../../../common/navigation/constants';
import { encodeQuery } from '../../../common/navigation/query_utils';
import { Evaluation } from '../../../../common/types';
import { RisksTable } from '../compliance_charts/risks_table';
import { INTERNAL_FEATURE_FLAGS } from '../../../../common/constants';

type BenchmarksWithIcons = 'CIS Kubernetes';

const logoMap: Record<BenchmarksWithIcons, EuiIconType> = {
  'CIS Kubernetes': 'logoKubernetes',
};

const isBenchmarkWithIcon = (benchmark: string): benchmark is BenchmarksWithIcons =>
  benchmark in logoMap;

const getBenchmarkLogo = (benchmarkName: BenchmarksWithIcons | string): EuiIconType => {
  if (isBenchmarkWithIcon(benchmarkName)) return logoMap[benchmarkName];
  return 'logoElastic';
};

const getBenchmarkEvaluationQuery = (name: string, evaluation: Evaluation): Query => ({
  language: 'kuery',
  query: `rule.benchmark : "${name}" and result.evaluation : "${evaluation}"`,
});

const mockClusterId = '2468540';

export const BenchmarksSection = () => {
  const { euiTheme } = useEuiTheme();
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
        <EuiPanel hasBorder hasShadow={false} paddingSize="none">
          <EuiFlexGroup>
            <EuiFlexItem grow={2} style={getIntegrationBoxStyle(euiTheme)}>
              <EuiText>
                <h4>{benchmark.name}</h4>
              </EuiText>
              {INTERNAL_FEATURE_FLAGS.clusterMetaMock && (
                <>
                  <EuiText>
                    <h4>{`Cluster ID ${mockClusterId}`}</h4>
                  </EuiText>
                  <EuiSpacer size="xs" />
                  <EuiText size="xs" color="subdue">
                    <EuiIcon type="clock" />
                    {'Updated 7 second ago'}
                  </EuiText>
                </>
              )}
              <EuiSpacer />
              <EuiIcon type={getBenchmarkLogo(benchmark.name)} size="xxl" />
              {INTERNAL_FEATURE_FLAGS.manageRulesMock && (
                <>
                  <EuiSpacer />
                  <EuiButtonEmpty>{'Manage Rules'}</EuiButtonEmpty>
                </>
              )}
            </EuiFlexItem>
            <EuiFlexItem grow={4} style={{ borderRight: '1px solid #D3DAE6' }}>
              <ChartPanel
                title={TEXT.COMPLIANCE_SCORE}
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
            </EuiFlexItem>
            <EuiFlexItem grow={4}>
              <ChartPanel
                title={TEXT.RISKS}
                hasBorder={false}
                isLoading={getStats.isLoading}
                isError={getStats.isError}
              >
                <RisksTable data={getStats.data.resourceTypesAggs} />
              </ChartPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      ))}
    </>
  );
};

const getIntegrationBoxStyle = (euiTheme: EuiThemeComputed) => ({
  border: `1px solid ${euiTheme.colors.lightShade}`,
  borderRadius: `${euiTheme.border.radius.medium} 0 0 ${euiTheme.border.radius.medium}`,
  justifyContent: 'center',
  alignItems: 'center',
  background: euiTheme.colors.lightestShade,
  padding: 0,
});
