/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { PartitionElementEvent } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import { FlexItemGrowSize } from '@elastic/eui/src/components/flex/flex_item';
import { DASHBOARD_COUNTER_CARDS } from '../test_subjects';
import { CspCounterCard, CspCounterCardProps } from '../../../components/csp_counter_card';
import { CompactFormattedNumber } from '../../../components/compact_formatted_number';
import { ChartPanel } from '../../../components/chart_panel';
import { CloudPostureScoreChart } from '../compliance_charts/cloud_posture_score_chart';
import type { ComplianceDashboardData, Evaluation } from '../../../../common/types';
import { RisksTable } from '../compliance_charts/risks_table';
import {
  useNavigateFindings,
  useNavigateFindingsByResource,
} from '../../../common/hooks/use_navigate_findings';
import { RULE_FAILED } from '../../../../common/constants';

const defaultHeight = 360;

// TODO: limit this to desktop media queries only
const summarySectionWrapperStyle = {
  height: defaultHeight,
};

export const dashboardColumnsGrow: Record<string, FlexItemGrowSize> = {
  first: 3,
  second: 8,
  third: 8,
};

export const CloudSummarySection = ({
  complianceData,
}: {
  complianceData: ComplianceDashboardData;
}) => {
  const navToFindings = useNavigateFindings();
  const navToFindingsByResource = useNavigateFindingsByResource();

  const handleElementClick = (elements: PartitionElementEvent[]) => {
    const [element] = elements;
    const [layerValue] = element;
    const evaluation = layerValue[0].groupByRollup as Evaluation;

    navToFindings({ 'result.evaluation': evaluation });
  };

  const handleCellClick = (ruleSection: string) => {
    navToFindings({
      'rule.section': ruleSection,
      'result.evaluation': RULE_FAILED,
    });
  };

  const handleViewAllClick = () => {
    navToFindings({ 'result.evaluation': RULE_FAILED });
  };

  const counters: CspCounterCardProps[] = useMemo(
    () => [
      {
        id: DASHBOARD_COUNTER_CARDS.CLUSTERS_EVALUATED,
        title: i18n.translate(
          'xpack.csp.dashboard.summarySection.counterCard.clustersEvaluatedDescription',
          { defaultMessage: 'Clusters Evaluated' }
        ),
        description: <CompactFormattedNumber number={complianceData.clusters.length} />,
      },
      {
        id: DASHBOARD_COUNTER_CARDS.RESOURCES_EVALUATED,
        title: i18n.translate(
          'xpack.csp.dashboard.summarySection.counterCard.resourcesEvaluatedDescription',
          { defaultMessage: 'Resources Evaluated' }
        ),
        description: (
          <CompactFormattedNumber number={complianceData.stats.resourcesEvaluated || 0} />
        ),
        onClick: () => {
          navToFindingsByResource();
        },
      },
      {
        id: DASHBOARD_COUNTER_CARDS.FAILING_FINDINGS,
        title: i18n.translate(
          'xpack.csp.dashboard.summarySection.counterCard.failingFindingsDescription',
          { defaultMessage: 'Failing Findings' }
        ),
        description: <CompactFormattedNumber number={complianceData.stats.totalFailed} />,
        descriptionColor: complianceData.stats.totalFailed > 0 ? 'danger' : 'text',
        onClick: () => {
          navToFindings({ 'result.evaluation': RULE_FAILED });
        },
      },
    ],
    [
      complianceData.clusters.length,
      complianceData.stats.resourcesEvaluated,
      complianceData.stats.totalFailed,
      navToFindings,
      navToFindingsByResource,
    ]
  );

  return (
    <EuiFlexGroup gutterSize="l" style={summarySectionWrapperStyle}>
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
            partitionOnElementClick={handleElementClick}
          />
        </ChartPanel>
      </EuiFlexItem>
      <EuiFlexItem grow={dashboardColumnsGrow.third}>
        <ChartPanel
          title={i18n.translate('xpack.csp.dashboard.summarySection.failedFindingsPanelTitle', {
            defaultMessage: 'Failed Findings',
          })}
        >
          <RisksTable
            data={complianceData.groupedFindingsEvaluation}
            maxItems={5}
            onCellClick={handleCellClick}
            onViewAllClick={handleViewAllClick}
          />
        </ChartPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
