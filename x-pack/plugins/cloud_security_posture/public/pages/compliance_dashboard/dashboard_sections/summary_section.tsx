/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFlexItemProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { statusColors } from '../../../common/constants';
import { DASHBOARD_COUNTER_CARDS, DASHBOARD_SUMMARY_CONTAINER } from '../test_subjects';
import { CspCounterCard, CspCounterCardProps } from '../../../components/csp_counter_card';
import { CompactFormattedNumber } from '../../../components/compact_formatted_number';
import { ChartPanel } from '../../../components/chart_panel';
import { ComplianceScoreChart } from '../compliance_charts/compliance_score_chart';
import type {
  ComplianceDashboardData,
  Evaluation,
  PosturePolicyTemplate,
} from '../../../../common/types';
import { RisksTable } from '../compliance_charts/risks_table';
import {
  NavFilter,
  useNavigateFindings,
  useNavigateFindingsByResource,
} from '../../../common/hooks/use_navigate_findings';
import {
  CSPM_POLICY_TEMPLATE,
  KSPM_POLICY_TEMPLATE,
  RULE_FAILED,
} from '../../../../common/constants';
import { AccountsEvaluatedWidget } from '../../../components/accounts_evaluated_widget';

export const dashboardColumnsGrow: Record<string, EuiFlexItemProps['grow']> = {
  first: 3,
  second: 8,
  third: 8,
};

export const getPolicyTemplateQuery = (policyTemplate: PosturePolicyTemplate): NavFilter => {
  if (policyTemplate === CSPM_POLICY_TEMPLATE) {
    return { 'rule.benchmark.posture_type': CSPM_POLICY_TEMPLATE };
  }

  return { 'rule.benchmark.posture_type': { value: CSPM_POLICY_TEMPLATE, negate: true } };
};

export const SummarySection = ({
  dashboardType,
  complianceData,
}: {
  dashboardType: PosturePolicyTemplate;
  complianceData: ComplianceDashboardData;
}) => {
  const navToFindings = useNavigateFindings();
  const navToFindingsByResource = useNavigateFindingsByResource();

  const handleEvalCounterClick = (evaluation: Evaluation) => {
    navToFindings({ 'result.evaluation': evaluation, ...getPolicyTemplateQuery(dashboardType) });
  };

  const handleCellClick = (ruleSection: string) => {
    navToFindings({
      'rule.section': ruleSection,
      'result.evaluation': RULE_FAILED,
      ...getPolicyTemplateQuery(dashboardType),
    });
  };

  const handleViewAllClick = () => {
    navToFindings({ 'result.evaluation': RULE_FAILED, ...getPolicyTemplateQuery(dashboardType) });
  };

  const counters: CspCounterCardProps[] = useMemo(
    () => [
      {
        id: DASHBOARD_COUNTER_CARDS.CLUSTERS_EVALUATED,
        description:
          dashboardType === KSPM_POLICY_TEMPLATE
            ? i18n.translate(
                'xpack.csp.dashboard.summarySection.counterCard.clustersEvaluatedDescription',
                { defaultMessage: 'Clusters Evaluated' }
              )
            : i18n.translate(
                'xpack.csp.dashboard.summarySection.counterCard.accountsEvaluatedDescription',
                { defaultMessage: 'Accounts Evaluated' }
              ),
        title:
          dashboardType === KSPM_POLICY_TEMPLATE ? (
            <CompactFormattedNumber number={complianceData.clusters.length} />
          ) : (
            <AccountsEvaluatedWidget clusters={complianceData.clusters} />
          ),
      },
      {
        id: DASHBOARD_COUNTER_CARDS.RESOURCES_EVALUATED,
        description: i18n.translate(
          'xpack.csp.dashboard.summarySection.counterCard.resourcesEvaluatedDescription',
          { defaultMessage: 'Resources Evaluated' }
        ),
        title: <CompactFormattedNumber number={complianceData.stats.resourcesEvaluated || 0} />,
        onClick: () => {
          navToFindingsByResource(getPolicyTemplateQuery(dashboardType));
        },
      },
      {
        id: DASHBOARD_COUNTER_CARDS.FAILING_FINDINGS,
        description: i18n.translate(
          'xpack.csp.dashboard.summarySection.counterCard.failingFindingsDescription',
          { defaultMessage: 'Failing Findings' }
        ),
        title: <CompactFormattedNumber number={complianceData.stats.totalFailed} />,
        titleColor: complianceData.stats.totalFailed > 0 ? statusColors.failed : 'text',
        onClick: () => {
          navToFindings({
            'result.evaluation': RULE_FAILED,
            ...getPolicyTemplateQuery(dashboardType),
          });
        },
      },
    ],
    [
      complianceData.clusters,
      complianceData.stats.resourcesEvaluated,
      complianceData.stats.totalFailed,
      dashboardType,
      navToFindings,
      navToFindingsByResource,
    ]
  );

  const chartTitle = i18n.translate('xpack.csp.dashboard.summarySection.postureScorePanelTitle', {
    defaultMessage: 'Overall {type} Posture Score',
    values: {
      type: dashboardType === KSPM_POLICY_TEMPLATE ? 'Kubernetes' : 'Cloud',
    },
  });

  return (
    <EuiFlexGroup
      gutterSize="l"
      css={css`
        // height for compliance by cis section with max rows
        height: 310px;
      `}
      data-test-subj={DASHBOARD_SUMMARY_CONTAINER}
    >
      <EuiFlexItem grow={dashboardColumnsGrow.first}>
        <EuiFlexGroup direction="column">
          {counters.map((counter) => (
            <EuiFlexItem key={counter.id}>
              <CspCounterCard {...counter} />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={dashboardColumnsGrow.second}>
        <ChartPanel title={chartTitle}>
          <ComplianceScoreChart
            id="cloud_posture_score_chart"
            data={complianceData.stats}
            trend={complianceData.trend}
            onEvalCounterClick={handleEvalCounterClick}
          />
        </ChartPanel>
      </EuiFlexItem>
      <EuiFlexItem grow={dashboardColumnsGrow.third}>
        <ChartPanel
          title={i18n.translate(
            'xpack.csp.dashboard.summarySection.complianceByCisSectionPanelTitle',
            { defaultMessage: 'Compliance By CIS Section' }
          )}
        >
          <RisksTable
            data={complianceData.groupedFindingsEvaluation}
            maxItems={5}
            onCellClick={handleCellClick}
            onViewAllClick={handleViewAllClick}
            viewAllButtonTitle={i18n.translate(
              'xpack.csp.dashboard.risksTable.viewAllButtonTitle',
              { defaultMessage: 'View all failed findings' }
            )}
          />
        </ChartPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
