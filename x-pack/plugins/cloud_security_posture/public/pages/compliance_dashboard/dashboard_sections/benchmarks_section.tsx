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
import { PartitionElementEvent } from '@elastic/charts';
import { EuiThemeComputed } from '@elastic/eui/src/services/theme/types';
import { i18n } from '@kbn/i18n';
import { CloudPostureScoreChart } from '../compliance_charts/cloud_posture_score_chart';
import { ChartPanel } from '../../../components/chart_panel';
import type { ComplianceDashboardData, Evaluation } from '../../../../common/types';
import { RisksTable } from '../compliance_charts/risks_table';
import { INTERNAL_FEATURE_FLAGS, RULE_FAILED } from '../../../../common/constants';
import { useNavigateFindings } from '../../../common/hooks/use_navigate_findings';

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

    navToFindings({ 'cluster_id.keyword': clusterId, 'result.evaluation.keyword': evaluation });
  };

  const handleCellClick = (clusterId: string, ruleSection: string) => {
    navToFindings({
      'cluster_id.keyword': clusterId,
      'rule.section.keyword': ruleSection,
      'result.evaluation.keyword': RULE_FAILED,
    });
  };

  const handleViewAllClick = (clusterId: string) => {
    navToFindings({ 'cluster_id.keyword': clusterId, 'result.evaluation.keyword': RULE_FAILED });
  };

  return (
    <>
      {complianceData.clusters.map((cluster) => {
        const shortId = cluster.meta.clusterId.slice(0, 6);

        return (
          <React.Fragment key={cluster.meta.clusterId}>
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
                      {/* TODO: change default k8s logo to use a getBenchmarkLogo function */}
                      <EuiIcon type="logoKubernetes" size="xxl" />
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
                    title={i18n.translate(
                      'xpack.csp.dashboard.benchmarkSection.complianceScorePanelTitle',
                      {
                        defaultMessage: 'Compliance Score',
                      }
                    )}
                    hasBorder={false}
                  >
                    <CloudPostureScoreChart
                      id={`${cluster.meta.clusterId}_score_chart`}
                      data={cluster.stats}
                      trend={cluster.trend}
                      partitionOnElementClick={(elements) =>
                        handleElementClick(cluster.meta.clusterId, elements)
                      }
                    />
                  </ChartPanel>
                </EuiFlexItem>
                <EuiFlexItem grow={4}>
                  <ChartPanel
                    title={i18n.translate(
                      'xpack.csp.dashboard.benchmarkSection.failedFindingsPanelTitle',
                      {
                        defaultMessage: 'Failed Findings',
                      }
                    )}
                    hasBorder={false}
                  >
                    <RisksTable
                      data={cluster.groupedFindingsEvaluation}
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
          </React.Fragment>
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
