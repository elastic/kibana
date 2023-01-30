/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { ComplianceScoreChart } from '../compliance_charts/compliance_score_chart';
import type {
  ComplianceDashboardData,
  Evaluation,
  PosturePolicyTemplate,
} from '../../../../common/types';
import { RisksTable } from '../compliance_charts/risks_table';
import { KSPM_POLICY_TEMPLATE, RULE_FAILED } from '../../../../common/constants';
import { useNavigateFindings } from '../../../common/hooks/use_navigate_findings';
import { ClusterDetailsBox } from './cluster_details_box';
import { dashboardColumnsGrow, getPolicyTemplateQuery } from './summary_section';

export const BenchmarksSection = ({
  complianceData,
  dashboardType,
}: {
  complianceData: ComplianceDashboardData;
  dashboardType: PosturePolicyTemplate;
}) => {
  const { euiTheme } = useEuiTheme();
  const navToFindings = useNavigateFindings();

  const handleEvalCounterClick = (clusterId: string, evaluation: Evaluation) => {
    navToFindings({
      cluster_id: clusterId,
      'result.evaluation': evaluation,
      ...getPolicyTemplateQuery(dashboardType),
    });
  };

  const handleCellClick = (clusterId: string, ruleSection: string) => {
    navToFindings({
      cluster_id: clusterId,
      'rule.section': ruleSection,
      'result.evaluation': RULE_FAILED,
      ...getPolicyTemplateQuery(dashboardType),
    });
  };

  const handleViewAllClick = (clusterId: string) => {
    navToFindings({
      cluster_id: clusterId,
      'result.evaluation': RULE_FAILED,
      ...getPolicyTemplateQuery(dashboardType),
    });
  };

  return (
    <>
      <EuiFlexGroup
        alignItems="flexStart"
        gutterSize="none"
        style={{
          borderBottom: euiTheme.border.thick,
          borderBottomColor: euiTheme.colors.text,
          paddingBottom: euiTheme.size.s,
        }}
      >
        <EuiFlexItem grow={dashboardColumnsGrow.first}>
          <EuiTitle size="xxs" css={{ fontWeight: euiTheme.font.weight.semiBold }}>
            <h5>
              {dashboardType === KSPM_POLICY_TEMPLATE ? (
                <FormattedMessage
                  id="xpack.csp.dashboard.benchmarkSection.columnsHeader.clusterNameTitle"
                  defaultMessage="Cluster Name"
                />
              ) : (
                <FormattedMessage
                  id="xpack.csp.dashboard.benchmarkSection.columnsHeader.accountNameTitle"
                  defaultMessage="Account Name"
                />
              )}
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
                id="xpack.csp.dashboard.benchmarkSection.columnsHeader.complianceScoreTitle"
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
                id="xpack.csp.dashboard.benchmarkSection.columnsHeader.complianceByCisSectionTitle"
                defaultMessage="Compliance by CIS Section"
              />
            </h5>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      {complianceData.clusters.map((cluster) => (
        <React.Fragment key={cluster.meta.clusterId}>
          <EuiFlexGroup
            key={cluster.meta.clusterId}
            style={{ borderBottom: euiTheme.border.thin, padding: `${euiTheme.size.base} 0` }}
          >
            <EuiFlexItem grow={dashboardColumnsGrow.first}>
              <ClusterDetailsBox cluster={cluster} />
            </EuiFlexItem>
            <EuiFlexItem grow={dashboardColumnsGrow.second}>
              <div
                style={{
                  paddingLeft: euiTheme.size.base,
                  paddingRight: euiTheme.size.base,
                  height: '100%',
                }}
              >
                <ComplianceScoreChart
                  compact
                  id={`${cluster.meta.clusterId}_score_chart`}
                  data={cluster.stats}
                  trend={cluster.trend}
                  onEvalCounterClick={(evaluation) =>
                    handleEvalCounterClick(cluster.meta.clusterId, evaluation)
                  }
                />
              </div>
            </EuiFlexItem>
            <EuiFlexItem grow={dashboardColumnsGrow.third}>
              <div style={{ paddingLeft: euiTheme.size.base, paddingRight: euiTheme.size.base }}>
                <RisksTable
                  compact
                  data={cluster.groupedFindingsEvaluation}
                  maxItems={3}
                  onCellClick={(resourceTypeName) =>
                    handleCellClick(cluster.meta.clusterId, resourceTypeName)
                  }
                  viewAllButtonTitle={i18n.translate(
                    'xpack.csp.dashboard.risksTable.clusterCardViewAllButtonTitle',
                    { defaultMessage: 'View all failed findings for this cluster' }
                  )}
                  onViewAllClick={() => handleViewAllClick(cluster.meta.clusterId)}
                />
              </div>
            </EuiFlexItem>
          </EuiFlexGroup>
        </React.Fragment>
      ))}
    </>
  );
};
