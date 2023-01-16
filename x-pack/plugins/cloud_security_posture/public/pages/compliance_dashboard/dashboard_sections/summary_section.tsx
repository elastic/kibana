/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFlexItemProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { statusColors } from '../../../common/constants';
import { DASHBOARD_COUNTER_CARDS } from '../test_subjects';
import { CspCounterCard, CspCounterCardProps } from '../../../components/csp_counter_card';
import { CompactFormattedNumber } from '../../../components/compact_formatted_number';
import { ChartPanel } from '../../../components/chart_panel';
import { CloudPostureScoreChart } from '../compliance_charts/cloud_posture_score_chart';
import type {
  ComplianceDashboardData,
  Evaluation,
  PosturePolicyTemplate,
} from '../../../../common/types';
import { RisksTable } from '../compliance_charts/risks_table';
import {
  useNavigateFindings,
  useNavigateFindingsByResource,
} from '../../../common/hooks/use_navigate_findings';
import {
  CSPM_POLICY_TEMPLATE,
  KSPM_POLICY_TEMPLATE,
  RULE_FAILED,
} from '../../../../common/constants';

export const dashboardColumnsGrow: Record<string, EuiFlexItemProps['grow']> = {
  first: 3,
  second: 8,
  third: 8,
};

// TODO: CIS AWS - replace query to use policy_template field when available
export const getPolicyTemplateQuery = (policyTemplate: PosturePolicyTemplate) => {
  if (policyTemplate === CSPM_POLICY_TEMPLATE) return { 'rule.benchmark.id': 'cis_aws' };
  if (policyTemplate === KSPM_POLICY_TEMPLATE) return { 'rule.benchmark.id': 'cis_k8s' };
  return {};
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
        title: <CompactFormattedNumber number={complianceData.clusters.length} />,
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
      complianceData.clusters.length,
      complianceData.stats.resourcesEvaluated,
      complianceData.stats.totalFailed,
      dashboardType,
      navToFindings,
      navToFindingsByResource,
    ]
  );

  return (
    <EuiFlexGroup gutterSize="l">
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
        <ChartPanel
          title={i18n.translate('xpack.csp.dashboard.summarySection.cloudPostureScorePanelTitle', {
            defaultMessage: 'Cloud Posture Score',
          })}
        >
          <CloudPostureScoreChart
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
