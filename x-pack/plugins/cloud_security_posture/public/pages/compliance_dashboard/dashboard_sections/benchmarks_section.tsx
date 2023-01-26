/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiTitle, useEuiTheme } from '@elastic/eui';
import type { EuiIconProps } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CSSObject } from '@emotion/react';
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

export const TABLE_HEADER_TEST_ID = 'csp:dashboard-sections-table-header';
export const TABLE_HEADER_SCORE_TEST_ID = 'csp:dashboard-sections-table-header-score';
export const TABLE_COLUMN_SCORE_TEST_ID = 'csp:dashboard-sections-table-column-score';

type SortOrder = 'asc' | 'desc';

const CLUSTER_DEFAULT_SORT_ORDER: SortOrder = 'desc';
const CLUSTER_SORT_BUTTON_CLASS = 'cspDashboard__sortButton';

export const BenchmarksSection = ({
  complianceData,
  dashboardType,
}: {
  complianceData: ComplianceDashboardData;
  dashboardType: PosturePolicyTemplate;
}) => {
  const { euiTheme } = useEuiTheme();
  const navToFindings = useNavigateFindings();

  const [clusterSorting, setClusterSorting] = useLocalStorage<SortOrder>(
    LOCAL_STORAGE_DASHBOARD_CLUSTER_SORT_KEY,
    CLUSTER_DEFAULT_SORT_ORDER
  );

  const isClusterSortingAsc = clusterSorting === 'asc';

  const clusterSortingIcon: EuiIconProps['type'] = isClusterSortingAsc ? 'sortUp' : 'sortDown';

  const navToFindingsByClusterAndEvaluation = useCallback(
    (clusterId: string, evaluation: Evaluation) => {
      navToFindings({
        ...getPolicyTemplateQuery(dashboardType),
        cluster_id: clusterId,
        'result.evaluation': evaluation,
      });
    },
    [dashboardType, navToFindings]
  );

  const navToFailedFindingsByClusterAndSection = useCallback(
    (clusterId: string, ruleSection: string) => {
      navToFindings({
        ...getPolicyTemplateQuery(dashboardType),
        cluster_id: clusterId,
        'rule.section': ruleSection,
        'result.evaluation': RULE_FAILED,
      });
    },
    [dashboardType, navToFindings]
  );

  const navToFailedFindingsByCluster = useCallback(
    (clusterId: string) => {
      navToFindingsByClusterAndEvaluation(clusterId, RULE_FAILED);
    },
    [navToFindingsByClusterAndEvaluation]
  );

  const clusterSortingToggle = useCallback(() => {
    setClusterSorting(isClusterSortingAsc ? 'desc' : 'asc');
  }, [isClusterSortingAsc, setClusterSorting]);

  const clusters = useMemo(() => {
    return complianceData.clusters.sort((clusterA, clusterB) =>
      isClusterSortingAsc
        ? clusterA.stats.postureScore - clusterB.stats.postureScore
        : clusterB.stats.postureScore - clusterA.stats.postureScore
    );
  }, [complianceData.clusters, isClusterSortingAsc]);

  const flexTableHeaderStyle: CSSObject = useMemo(
    () => ({
      borderBottom: euiTheme.border.thick,
      borderBottomColor: euiTheme.colors.text,
      paddingBottom: euiTheme.size.s,
      [`.${CLUSTER_SORT_BUTTON_CLASS}`]: {
        fontWeight: euiTheme.font.weight.semiBold,
      },
      button: {
        textAlign: 'left',
      },
    }),
    [euiTheme.border.thick, euiTheme.colors.text, euiTheme.font.weight.semiBold, euiTheme.size]
  );

  const flexTableRowStyle: CSSObject = useMemo(
    () => ({
      borderBottom: euiTheme.border.thin,
      padding: `${euiTheme.size.base} 0 ${euiTheme.size.l}`,
    }),
    [euiTheme.border.thin, euiTheme.size]
  );

  return (
    <>
      <EuiFlexGroup css={flexTableHeaderStyle}>
        <EuiFlexItem data-test-subj={TABLE_HEADER_TEST_ID} grow={dashboardColumnsGrow.first}>
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
        <EuiFlexItem data-test-subj={TABLE_HEADER_TEST_ID} grow={dashboardColumnsGrow.second}>
          <button
            data-test-subj={TABLE_HEADER_SCORE_TEST_ID}
            className={CLUSTER_SORT_BUTTON_CLASS}
            onClick={clusterSortingToggle}
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
        <EuiFlexItem data-test-subj={TABLE_HEADER_TEST_ID} grow={dashboardColumnsGrow.third}>
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
        <EuiFlexGroup key={cluster.meta.clusterId} css={flexTableRowStyle}>
          <EuiFlexItem grow={dashboardColumnsGrow.first}>
            <ClusterDetailsBox cluster={cluster} />
          </EuiFlexItem>
          <EuiFlexItem
            grow={dashboardColumnsGrow.second}
            data-test-subj={TABLE_COLUMN_SCORE_TEST_ID}
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
