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
  EuiToolTip,
  EuiLink,
} from '@elastic/eui';
import moment from 'moment';
import { PartitionElementEvent } from '@elastic/charts';
import { EuiThemeComputed } from '@elastic/eui/src/services/theme/types';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { CISBenchmarkIcon } from '../../../components/cis_benchmark_icon';
import { CloudPostureScoreChart } from '../compliance_charts/cloud_posture_score_chart';
import { ChartPanel } from '../../../components/chart_panel';
import type { ComplianceDashboardData, Evaluation } from '../../../../common/types';
import { RisksTable } from '../compliance_charts/risks_table';
import { RULE_FAILED } from '../../../../common/constants';
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

    navToFindings({ cluster_id: clusterId, 'result.evaluation': evaluation });
  };

  const handleCellClick = (clusterId: string, ruleSection: string) => {
    navToFindings({
      cluster_id: clusterId,
      'rule.section': ruleSection,
      'result.evaluation': RULE_FAILED,
    });
  };

  const handleViewAllClick = (clusterId: string) => {
    navToFindings({ cluster_id: clusterId, 'result.evaluation': RULE_FAILED });
  };

  const handleClusterTitleClick = (clusterId: string) => {
    navToFindings({ cluster_id: clusterId });
  };

  return (
    <>
      {complianceData.clusters.map((cluster) => {
        const shortId = cluster.meta.clusterId.slice(0, 6);
        const title = cluster.meta.clusterName || 'Cluster ID';
        return (
          <React.Fragment key={cluster.meta.clusterId}>
            <EuiPanel hasBorder hasShadow={false} paddingSize="none">
              <EuiFlexGroup gutterSize="none" style={{ height: cardHeight }}>
                <EuiFlexItem grow={2} style={getClusterDetailsBoxStyle(euiTheme)}>
                  <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
                    <EuiFlexItem grow={false}>
                      <EuiToolTip
                        position="top"
                        content={
                          <EuiText>
                            <FormattedMessage
                              id="xpack.csp.dashboard.benchmarkSection.clusterTitleTooltip.clusterPrefixTitle"
                              defaultMessage="Show all findings for "
                            />
                            <strong>
                              <FormattedMessage
                                id="xpack.csp.dashboard.benchmarkSection.clusterTitleTooltip.clusterTitle"
                                defaultMessage="{title} - {shortId}"
                                values={{
                                  title,
                                  shortId,
                                }}
                              />
                            </strong>
                          </EuiText>
                        }
                      >
                        <EuiLink
                          onClick={() => handleClusterTitleClick(cluster.meta.clusterId)}
                          color="text"
                        >
                          <EuiText>
                            <h3>{`${title} - ${shortId}`}</h3>
                          </EuiText>
                        </EuiLink>
                      </EuiToolTip>
                      <EuiSpacer size="s" />
                      <EuiText size="xs" color="subdued">
                        <EuiIcon type="clock" />
                        <FormattedMessage
                          id="xpack.csp.dashboard.benchmarkSection.lastEvaluatedTitle"
                          defaultMessage=" Last evaluated {dateFromNow}"
                          values={{
                            dateFromNow: moment(cluster.meta.lastUpdate).fromNow(),
                          }}
                        />
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={true}>
                      <CISBenchmarkIcon
                        type={cluster.meta.benchmarkId}
                        name={cluster.meta.benchmarkName}
                        style={{
                          width: 64,
                          height: 64,
                        }}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty>
                        <FormattedMessage
                          id="xpack.csp.dashboard.benchmarkSection.manageRulesButton"
                          defaultMessage="Manage Rules"
                        />
                      </EuiButtonEmpty>
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
                      { defaultMessage: 'Compliance Score' }
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
                      { defaultMessage: 'Failed Findings' }
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

const getClusterDetailsBoxStyle = (euiTheme: EuiThemeComputed) => ({
  borderRight: `1px solid ${euiTheme.colors.lightShade}`,
  borderRadius: `${euiTheme.border.radius.medium} 0 0 ${euiTheme.border.radius.medium}`,
  background: euiTheme.colors.lightestShade,
  padding: 16,
});
