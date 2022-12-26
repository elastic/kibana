/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem, EuiFlexGroup, useEuiTheme, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { CompliancePostureScoreChart } from '../compliance_charts/compliance_posture_score_chart';
import type { ComplianceDashboardData, Evaluation } from '../../../../common/types';
import { RisksTable } from '../compliance_charts/risks_table';
import { RULE_FAILED } from '../../../../common/constants';
import { useNavigateFindings } from '../../../common/hooks/use_navigate_findings';
import { ClusterDetailsBox } from './cluster_details_box';
import { dashboardColumnsGrow } from './kubernetes_summary_section';

export const KubernetesBenchmarksSection = ({
  complianceData,
}: {
  complianceData: ComplianceDashboardData;
}) => {
  const { euiTheme } = useEuiTheme();
  const navToFindings = useNavigateFindings();

  const handleEvalCounterClick = (clusterId: string, evaluation: Evaluation) => {
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

  return <PostureCardsTable cardsData={complianceData.clusters} />;

  return (
    <>
      <EuiFlexGroup
        alignItems="flexStart"
        gutterSize="none"
        style={{
          borderBottom: euiTheme.border.thick,
          borderBottomColor: euiTheme.colors.text,
          marginBottom: euiTheme.size.m,
          paddingBottom: euiTheme.size.s,
        }}
      >
        <EuiFlexItem grow={dashboardColumnsGrow.first}>
          <EuiTitle size="xxs" css={{ fontWeight: euiTheme.font.weight.semiBold }}>
            <h5>
              <FormattedMessage
                id="xpack.csp.dashboard.kubernetesBenchmarkSection.columnsHeader.clusterNameTitle"
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
                id="xpack.csp.dashboard.kubernetesBenchmarkSection.columnsHeader.complianceScoreTitle"
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
                id="xpack.csp.dashboard.kubernetesBenchmarkSection.columnsHeader.complianceByCisSectionTitle"
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
            <div
              style={{
                paddingLeft: euiTheme.size.base,
                paddingRight: euiTheme.size.base,
                height: '100%',
              }}
            >
              <CompliancePostureScoreChart
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
      ))}
    </>
  );
};

const PostureCardsTable = ({ cardsData }) => {
  const { euiTheme } = useEuiTheme();
  const navToFindings = useNavigateFindings();

  const handleEvalCounterClick = (clusterId: string, evaluation: Evaluation) => {
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

  const columns = [
    {
      label: i18n.translate(
        'xpack.csp.dashboard.kubernetesBenchmarkSection.columnsHeader.clusterNameTitle',
        { defaultMessage: 'Cluster Name' }
      ),
      render: (data) => <ClusterDetailsBox cluster={data} />,
    },
    {
      label: i18n.translate(
        'xpack.csp.dashboard.kubernetesBenchmarkSection.columnsHeader.complianceScoreTitle',
        { defaultMessage: 'Compliance Score' }
      ),
      render: (data) => (
        <CompliancePostureScoreChart
          compact
          id={`${data.meta.clusterId}_score_chart`}
          data={data.stats}
          trend={data.trend}
          onEvalCounterClick={(evaluation) =>
            handleEvalCounterClick(data.meta.clusterId, evaluation)
          }
        />
      ),
    },
    {
      label: i18n.translate(
        'xpack.csp.dashboard.kubernetesBenchmarkSection.columnsHeader.complianceByCisSectionTitle',
        { defaultMessage: 'Compliance By CIS Section' }
      ),
      render: (data) => (
        <RisksTable
          compact
          data={data.groupedFindingsEvaluation}
          maxItems={3}
          onCellClick={(resourceTypeName) => handleCellClick(data.meta.clusterId, resourceTypeName)}
          viewAllButtonTitle={i18n.translate(
            'xpack.csp.dashboard.risksTable.clusterCardViewAllButtonTitle',
            { defaultMessage: 'View all failed findings for this cluster' }
          )}
          onViewAllClick={() => handleViewAllClick(data.meta.clusterId)}
        />
      ),
    },
  ];

  return (
    <>
      <EuiFlexGroup
        alignItems="flexStart"
        gutterSize="none"
        style={{
          borderBottom: euiTheme.border.thick,
          borderBottomColor: euiTheme.colors.text,
          marginBottom: euiTheme.size.m,
          paddingBottom: euiTheme.size.s,
        }}
      >
        {columns.map((c, i) => (
          <EuiFlexItem grow={dashboardColumnsGrow.first}>
            <EuiTitle
              size="xxs"
              css={{
                fontWeight: euiTheme.font.weight.semiBold,
              }}
            >
              <h5>{c.label}</h5>
            </EuiTitle>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
      {cardsData.map((cluster) => {
        return (
          <EuiFlexGroup
            key={cluster.meta.clusterId}
            gutterSize="l"
            style={{ borderBottom: euiTheme.border.thin }}
          >
            <EuiFlexItem grow={dashboardColumnsGrow.first}>
              {columns[0].render(cluster)}
            </EuiFlexItem>
            <EuiFlexItem grow={dashboardColumnsGrow.second}>
              <div
                style={{
                  paddingLeft: euiTheme.size.base,
                  paddingRight: euiTheme.size.base,
                  height: '100%',
                }}
              >
                {columns[1].render(cluster)}
              </div>
            </EuiFlexItem>
            <EuiFlexItem grow={dashboardColumnsGrow.third}>
              <div style={{ paddingLeft: euiTheme.size.base, paddingRight: euiTheme.size.base }}>
                {columns[2].render(cluster)}
              </div>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      })}
    </>
  );
};
