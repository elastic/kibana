/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem, EuiFlexGroup, useEuiTheme, EuiTitle } from '@elastic/eui';
import { PartitionElementEvent } from '@elastic/charts';
import { FormattedMessage } from '@kbn/i18n-react';
import { ChartPanel } from '../../../components/chart_panel';
import { CloudPostureScoreChart } from '../compliance_charts/cloud_posture_score_chart';
import type { ComplianceDashboardData, Evaluation } from '../../../../common/types';
import { RisksTable } from '../compliance_charts/risks_table';
import { RULE_FAILED } from '../../../../common/constants';
import { useNavigateFindings } from '../../../common/hooks/use_navigate_findings';
import { ClusterDetailsBox } from './cluster_details_box';
import { dashboardColumnsGrow } from './cloud_summary_section';

export const CloudBenchmarksSection = ({
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

  return (
    <>
      <EuiFlexGroup
        alignItems="flexStart"
        gutterSize="none"
        style={{
          borderBottom: euiTheme.border.thick,
          borderBottomColor: euiTheme.colors.text,
          marginBottom: euiTheme.size.l,
          paddingBottom: euiTheme.size.s,
        }}
      >
        <EuiFlexItem grow={dashboardColumnsGrow.first}>
          <EuiTitle size="xxs" css={{ fontWeight: euiTheme.font.weight.semiBold }}>
            <h5>
              <FormattedMessage
                id="xpack.csp.dashboard.cloudBenchmarkSection.columnsHeader.clusterNameTitle"
                defaultMessage="Cluster Name"
              />
            </h5>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={dashboardColumnsGrow.second}>
          <EuiTitle
            size="xxs"
            css={{ fontWeight: euiTheme.font.weight.semiBold, paddingLeft: euiTheme.size.xl }}
          >
            <h5>
              <FormattedMessage
                id="xpack.csp.dashboard.cloudBenchmarkSection.columnsHeader.complianceScoreTitle"
                defaultMessage="Compliance Score"
              />
            </h5>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={dashboardColumnsGrow.third}>
          <EuiTitle
            size="xxs"
            css={{ fontWeight: euiTheme.font.weight.semiBold, paddingLeft: euiTheme.size.xl }}
          >
            <h5>
              <FormattedMessage
                id="xpack.csp.dashboard.cloudBenchmarkSection.columnsHeader.complianceByCisSectionTitle"
                defaultMessage="Compliance by CIS Section"
              />
            </h5>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      {complianceData.clusters.map((cluster) => (
        <EuiFlexGroup
          key={cluster.meta.clusterId}
          gutterSize="l"
          style={{ borderBottom: euiTheme.border.thin }}
        >
          <EuiFlexItem grow={dashboardColumnsGrow.first}>
            <ClusterDetailsBox cluster={cluster} />
          </EuiFlexItem>
          <EuiFlexItem grow={dashboardColumnsGrow.second}>
            <ChartPanel hasBorder={false}>
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
          <EuiFlexItem grow={dashboardColumnsGrow.third}>
            <ChartPanel hasBorder={false}>
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
      ))}
    </>
  );
};
