/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiTitle, useEuiTheme } from '@elastic/eui';
import type { EuiIconProps } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { CloudPostureScoreChart } from '../compliance_charts/cloud_posture_score_chart';
import type {
  ComplianceDashboardData,
  Evaluation,
  PosturePolicyTemplate,
} from '../../../../common/types';
import { LOCAL_STORAGE_DASHBOARD_CLUSTER_SORT_KEY } from '../../../common/constants';
import { RisksTable } from '../compliance_charts/risks_table';
import { KSPM_POLICY_TEMPLATE, RULE_FAILED } from '../../../../common/constants';
import { useNavigateFindings } from '../../../common/hooks/use_navigate_findings';
import { ClusterDetailsBox } from './cluster_details_box';
import { dashboardColumnsGrow, getPolicyTemplateQuery } from './summary_section';
import {
  DASHBOARD_TABLE_COLUMN_SCORE_TEST_ID,
  DASHBOARD_TABLE_HEADER_SCORE_TEST_ID,
} from '../../findings/test_subjects';

const CLUSTER_DEFAULT_SORT_ORDER = 'asc';

export const BenchmarksSection = ({
  complianceData,
  dashboardType,
}: {
  complianceData: ComplianceDashboardData;
  dashboardType: PosturePolicyTemplate;
}) => {
  const { euiTheme } = useEuiTheme();
  const navToFindings = useNavigateFindings();

  const [clusterSorting, setClusterSorting] = useLocalStorage<'asc' | 'desc'>(
    LOCAL_STORAGE_DASHBOARD_CLUSTER_SORT_KEY,
    CLUSTER_DEFAULT_SORT_ORDER
  );

  const isClusterSortingAsc = clusterSorting === 'asc';

  const clusterSortingIcon: EuiIconProps['type'] = isClusterSortingAsc ? 'sortUp' : 'sortDown';

  const navToFindingsByClusterAndEvaluation = (clusterId: string, evaluation: Evaluation) => {
    navToFindings({
      ...getPolicyTemplateQuery(dashboardType),
      cluster_id: clusterId,
      'result.evaluation': evaluation,
    });
  };

  const navToFailedFindingsByClusterAndSection = (clusterId: string, ruleSection: string) => {
    navToFindings({
      ...getPolicyTemplateQuery(dashboardType),
      cluster_id: clusterId,
      'rule.section': ruleSection,
      'result.evaluation': RULE_FAILED,
    });
  };

  const navToFailedFindingsByCluster = (clusterId: string) => {
    navToFindingsByClusterAndEvaluation(clusterId, RULE_FAILED);
  };

  const toggleClustersSortingDirection = () => {
    setClusterSorting(isClusterSortingAsc ? 'desc' : 'asc');
  };

  const clusters = useMemo(() => {
    return [...complianceData.clusters].sort((clusterA, clusterB) =>
      isClusterSortingAsc
        ? clusterA.stats.postureScore - clusterB.stats.postureScore
        : clusterB.stats.postureScore - clusterA.stats.postureScore
    );
  }, [complianceData.clusters, isClusterSortingAsc]);

  return (
    <>
      <EuiFlexGroup
        css={css`
        border-bottom: ${euiTheme.border.thick};
        border-bottom-color: ${euiTheme.colors.text};
        padding-bottom: ${euiTheme.size.s};
        .euiTitle {
          font-weight: ${euiTheme.font.weight.semiBold};
        };
        button {
          text-align: left;
        },
      `}
      >
        <EuiFlexItem grow={dashboardColumnsGrow.first}>
          <EuiTitle size="xxs">
            <div>
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
            </div>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={dashboardColumnsGrow.second}>
          <button
            data-test-subj={DASHBOARD_TABLE_HEADER_SCORE_TEST_ID}
            onClick={toggleClustersSortingDirection}
          >
            <EuiTitle size="xxs">
              <div>
                <FormattedMessage
                  id="xpack.csp.dashboard.benchmarkSection.columnsHeader.complianceScoreTitle"
                  defaultMessage="Compliance Score"
                />
                <EuiIcon className="euiTableSortIcon" type={clusterSortingIcon} />
              </div>
            </EuiTitle>
          </button>
        </EuiFlexItem>
        <EuiFlexItem grow={dashboardColumnsGrow.third}>
          <EuiTitle size="xxs">
            <div>
              <FormattedMessage
                id="xpack.csp.dashboard.benchmarkSection.columnsHeader.complianceByCisSectionTitle"
                defaultMessage="Compliance by CIS Section"
              />
            </div>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      {clusters.map((cluster) => (
        <EuiFlexGroup
          key={cluster.meta.clusterId}
          css={css`
            border-bottom: ${euiTheme.border.thin};
            padding: ${euiTheme.size.base} 0 ${euiTheme.size.l};
          `}
        >
          <EuiFlexItem grow={dashboardColumnsGrow.first}>
            <ClusterDetailsBox cluster={cluster} />
          </EuiFlexItem>
          <EuiFlexItem
            grow={dashboardColumnsGrow.second}
            data-test-subj={DASHBOARD_TABLE_COLUMN_SCORE_TEST_ID}
          >
            <CloudPostureScoreChart
              compact
              id={`${cluster.meta.clusterId}_score_chart`}
              data={cluster.stats}
              trend={cluster.trend}
              onEvalCounterClick={(evaluation) =>
                navToFindingsByClusterAndEvaluation(cluster.meta.clusterId, evaluation)
              }
            />
          </EuiFlexItem>
          <EuiFlexItem grow={dashboardColumnsGrow.third}>
            <RisksTable
              compact
              data={cluster.groupedFindingsEvaluation}
              maxItems={3}
              onCellClick={(resourceTypeName) =>
                navToFailedFindingsByClusterAndSection(cluster.meta.clusterId, resourceTypeName)
              }
              viewAllButtonTitle={i18n.translate(
                'xpack.csp.dashboard.risksTable.clusterCardViewAllButtonTitle',
                { defaultMessage: 'View all failed findings for this cluster' }
              )}
              onViewAllClick={() => navToFailedFindingsByCluster(cluster.meta.clusterId)}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      ))}
    </>
  );
};
