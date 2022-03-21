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
import moment from 'moment';
import { EuiIconType } from '@elastic/eui/src/components/icon/icon';
import { PartitionElementEvent } from '@elastic/charts';
import { EuiThemeComputed } from '@elastic/eui/src/services/theme/types';
import { CloudPostureScoreChart } from '../compliance_charts/cloud_posture_score_chart';
import { ChartPanel } from '../../../components/chart_panel';
import * as TEXT from '../translations';
import { ComplianceDashboardData, Evaluation } from '../../../../common/types';
import { RisksTable } from '../compliance_charts/risks_table';
import { INTERNAL_FEATURE_FLAGS, RULE_FAILED } from '../../../../common/constants';
import { useNavigateFindings } from '../../../common/hooks/use_navigate_findings';

const logoMap: ReadonlyMap<string, EuiIconType> = new Map([
  ['CIS Kubernetes V1.20', 'logoKubernetes'],
]);

const getBenchmarkLogo = (benchmarkName: string): EuiIconType => {
  return logoMap.get(benchmarkName) ?? 'logoElastic';
};

const cardHeight = 300;

export const BenchmarksSection = ({
  complianceData,
}: {
  complianceData: ComplianceDashboardData;
}) => {
  const { euiTheme } = useEuiTheme();
  const navToFindings = useNavigateFindings();

  const handleElementClick = (clusterId: string, elements: PartitionElementEvent[]) => {
    const [element] = elements;
    const [layerValue] = element;
    const evaluation = layerValue[0].groupByRollup as Evaluation;

    navToFindings({ cluster_id: clusterId, 'result.evaluation': evaluation });
  };

  const handleCellClick = (clusterId: string, resourceTypeName: string) => {
    navToFindings({
      cluster_id: clusterId,
      'resource.type': resourceTypeName,
      'result.evaluation': RULE_FAILED,
    });
  };

  const handleViewAllClick = (clusterId: string) => {
    navToFindings({ cluster_id: clusterId, 'result.evaluation': RULE_FAILED });
  };

  return (
    <>
      {complianceData.clusters.map((cluster) => {
        const shortId = cluster.meta.clusterId.slice(0, 6);

        return (
          <>
            <EuiPanel hasBorder hasShadow={false} paddingSize="none">
              <EuiFlexGroup gutterSize="none" style={{ height: cardHeight }}>
                <EuiFlexItem grow={2} style={getIntegrationBoxStyle(euiTheme)}>
                  <EuiFlexGroup direction="column" alignItems="center" justifyContent="spaceAround">
                    <EuiFlexItem grow={false}>
                      <EuiText style={{ textAlign: 'center' }}>
                        <h4>{cluster.meta.benchmarkName}</h4>
                      </EuiText>
                      <EuiText style={{ textAlign: 'center' }}>
                        <h4>{`Cluster ID ${shortId}`}</h4>
                      </EuiText>
                      <EuiSpacer size="xs" />
                      <EuiText size="xs" color="subdued" style={{ textAlign: 'center' }}>
                        <EuiIcon type="clock" />
                        {` ${moment(cluster.meta.lastUpdate).fromNow()}`}
                      </EuiText>
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
                  <ChartPanel title={TEXT.COMPLIANCE_SCORE} hasBorder={false}>
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
                  <ChartPanel title={TEXT.RISKS} hasBorder={false}>
                    <RisksTable
                      data={cluster.resourcesTypes}
                      maxItems={3}
                      onCellClick={(resourceTypeName) =>
                        handleCellClick(cluster.meta.clusterId, resourceTypeName)
                      }
                      onViewAllClick={() => handleViewAllClick(cluster.meta.clusterId)}
                    />
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
