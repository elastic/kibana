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

const getClusterIdEvaluationQuery = (name: string, evaluation: Evaluation): Query => ({
  language: 'kuery',
  query: `cluster_id : "${name}" and result.evaluation : "${evaluation}"`,
});

const mockClusterId = '2468540';

export const BenchmarksSection = () => {
  const { euiTheme } = useEuiTheme();
  const history = useHistory();
  const getStats = useCloudPostureStatsApi();
  const clusters = getStats.isSuccess && getStats.data.clusters;
  if (!clusters) return null;

  const handleElementClick = (clusterId: string, elements: PartitionElementEvent[]) => {
    const [element] = elements;
    const [layerValue] = element;
    const evaluation = layerValue[0].groupByRollup as Evaluation;

    history.push({
      pathname: allNavigationItems.findings.path,
      search: encodeQuery(getClusterIdEvaluationQuery(clusterId, evaluation)),
    });
  };

  return (
    <>
      {clusters.map((cluster) => {
        const shortId = cluster.meta.clusterId.slice(0, 6);

        return (
          <>
            <EuiPanel hasBorder hasShadow={false} paddingSize="none">
              <EuiFlexGroup gutterSize="none" style={{ height: 300 }}>
                <EuiFlexItem grow={2} style={getIntegrationBoxStyle(euiTheme)}>
                  <EuiFlexGroup direction="column" alignItems="center" justifyContent="spaceAround">
                    <EuiFlexItem grow={false}>
                      <EuiText style={{ textAlign: 'center' }}>
                        <h4>{cluster.meta.benchmarkName}</h4>
                      </EuiText>
                      <EuiText style={{ textAlign: 'center' }}>
                        <h4>{`Cluster ID ${shortId || mockClusterId}`}</h4>
                      </EuiText>
                      {INTERNAL_FEATURE_FLAGS.showClusterMetaMock && (
                        <EuiText size="xs" color="subdued" style={{ textAlign: 'center' }}>
                          <EuiIcon type="clock" />
                          {' Updated 7 second ago'}
                        </EuiText>
                      )}
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiIcon type={getBenchmarkLogo(cluster.meta.benchmarkName)} size="xxl" />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      {INTERNAL_FEATURE_FLAGS.showManageRulesMock && (
                        <EuiButtonEmpty>{'Manage Rules'}</EuiButtonEmpty>
                      )}
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                <EuiFlexItem
                  grow={4}
                  style={{ borderRight: `1px solid ${euiTheme.colors.lightShade}` }}
                >
                  <ChartPanel
                    title={TEXT.COMPLIANCE_SCORE}
                    hasBorder={false}
                    isLoading={getStats.isLoading}
                    isError={getStats.isError}
                  >
                    <CloudPostureScoreChart
                      id={`${cluster.meta.clusterId}_score_chart`}
                      data={cluster.stats}
                      partitionOnElementClick={(elements) =>
                        handleElementClick(cluster.meta.clusterId, elements)
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
                    <RisksTable data={cluster.resourcesTypes} />
                  </ChartPanel>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
            <EuiSpacer />
          </>
        );
      })}
    </>
  );
};

const getIntegrationBoxStyle = (euiTheme: EuiThemeComputed) => ({
  border: `1px solid ${euiTheme.colors.lightShade}`,
  borderRadius: `${euiTheme.border.radius.medium} 0 0 ${euiTheme.border.radius.medium}`,
  background: euiTheme.colors.lightestShade,
});
