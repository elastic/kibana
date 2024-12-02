/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { EuiIconProps, EuiPanel } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiTitle, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useNavigateFindings } from '@kbn/cloud-security-posture/src/hooks/use_navigate_findings';
import type { NavFilter } from '@kbn/cloud-security-posture/src/utils/query_utils';
import type {
  BenchmarkData,
  ComplianceDashboardDataV2,
  Evaluation,
  PosturePolicyTemplate,
} from '../../../../common/types_old';
import { RisksTable } from '../compliance_charts/risks_table';
import { RULE_FAILED, RULE_PASSED } from '../../../../common/constants';
import {
  LOCAL_STORAGE_DASHBOARD_BENCHMARK_SORT_KEY,
  FINDINGS_GROUPING_OPTIONS,
} from '../../../common/constants';
import { dashboardColumnsGrow, getPolicyTemplateQuery } from './summary_section';
import {
  DASHBOARD_TABLE_COLUMN_SCORE_TEST_ID,
  DASHBOARD_TABLE_HEADER_SCORE_TEST_ID,
} from '../test_subjects';
import { ComplianceScoreChart } from '../compliance_charts/compliance_score_chart';
import { BenchmarkDetailsBox } from './benchmark_details_box';
const BENCHMARK_DEFAULT_SORT_ORDER = 'asc';

export const getBenchmarkIdQuery = (benchmark: BenchmarkData): NavFilter => {
  return {
    'rule.benchmark.id': benchmark.meta.benchmarkId,
    'rule.benchmark.version': benchmark.meta.benchmarkVersion,
  };
};

export const BenchmarksSection = ({
  complianceData,
  dashboardType,
}: {
  complianceData: ComplianceDashboardDataV2;
  dashboardType: PosturePolicyTemplate;
}) => {
  const { euiTheme } = useEuiTheme();
  const navToFindings = useNavigateFindings();

  const [benchmarkSorting, setBenchmarkSorting] = useLocalStorage<'asc' | 'desc'>(
    LOCAL_STORAGE_DASHBOARD_BENCHMARK_SORT_KEY,
    BENCHMARK_DEFAULT_SORT_ORDER
  );

  const isBenchmarkSortingAsc = benchmarkSorting === 'asc';

  const benchmarkSortingIcon: EuiIconProps['type'] = isBenchmarkSortingAsc ? 'sortUp' : 'sortDown';

  const navToFindingsByBenchmarkAndEvaluation = (
    benchmark: BenchmarkData,
    evaluation: Evaluation,
    groupBy: string[] = [FINDINGS_GROUPING_OPTIONS.NONE]
  ) => {
    navToFindings(
      {
        ...getPolicyTemplateQuery(dashboardType),
        ...getBenchmarkIdQuery(benchmark),
        'result.evaluation': evaluation,
      },
      groupBy
    );
  };

  const navToFailedFindingsByBenchmarkAndSection = (
    benchmark: BenchmarkData,
    ruleSection: string,
    resultEvaluation: 'passed' | 'failed' = RULE_FAILED
  ) => {
    navToFindings(
      {
        ...getPolicyTemplateQuery(dashboardType),
        ...getBenchmarkIdQuery(benchmark),
        'rule.section': ruleSection,
        'result.evaluation': resultEvaluation,
      },
      [FINDINGS_GROUPING_OPTIONS.NONE]
    );
  };

  const navToFailedFindingsByBenchmark = (benchmark: BenchmarkData) => {
    navToFindingsByBenchmarkAndEvaluation(benchmark, RULE_FAILED, [
      FINDINGS_GROUPING_OPTIONS.RULE_SECTION,
    ]);
  };

  const toggleBenchmarkSortingDirection = () => {
    setBenchmarkSorting(isBenchmarkSortingAsc ? 'desc' : 'asc');
  };

  const benchmarks = useMemo(() => {
    return [...complianceData.benchmarks].sort((benchmarkA, benchmarkB) =>
      isBenchmarkSortingAsc
        ? benchmarkA.stats.postureScore - benchmarkB.stats.postureScore
        : benchmarkB.stats.postureScore - benchmarkA.stats.postureScore
    );
  }, [complianceData.benchmarks, isBenchmarkSortingAsc]);

  return (
    <EuiPanel hasBorder>
      <EuiFlexGroup
        css={css`
         border-bottom: ${euiTheme.border.thin};
         border-bottom-color: ${euiTheme.colors.lightShade};
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
              <FormattedMessage
                id="xpack.csp.dashboard.benchmarkSection.columnsHeader.benchmarks"
                defaultMessage="Benchmarks"
              />
            </div>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={dashboardColumnsGrow.second}>
          <button
            data-test-subj={DASHBOARD_TABLE_HEADER_SCORE_TEST_ID}
            onClick={toggleBenchmarkSortingDirection}
          >
            <EuiTitle size="xxs">
              <div>
                <FormattedMessage
                  id="xpack.csp.dashboard.benchmarkSection.columnsHeader.complianceScoreTitle"
                  defaultMessage="Compliance Score"
                />
                <EuiIcon type={benchmarkSortingIcon} />
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
      {benchmarks.map((benchmark) => (
        <EuiFlexGroup
          key={`${benchmark.meta.benchmarkId}_${benchmark.meta.benchmarkVersion}`}
          css={css`
            // card height with 3 items in risk table
            height: 200px;
            padding: ${euiTheme.size.base} 0 ${euiTheme.size.l};
            &:not(:last-of-type) {
              border-bottom: ${euiTheme.border.thin};
            }
          `}
        >
          <EuiFlexItem grow={dashboardColumnsGrow.first}>
            <BenchmarkDetailsBox benchmark={benchmark} />
          </EuiFlexItem>
          <EuiFlexItem
            grow={dashboardColumnsGrow.second}
            css={css`
              margin-left: -${euiTheme.size.s};
            `}
            data-test-subj={DASHBOARD_TABLE_COLUMN_SCORE_TEST_ID}
          >
            <ComplianceScoreChart
              compact
              id={`${benchmark.meta.benchmarkId}_score_chart`}
              data={benchmark.stats}
              trend={benchmark.trend}
              onEvalCounterClick={(evaluation) =>
                navToFindingsByBenchmarkAndEvaluation(benchmark, evaluation)
              }
            />
          </EuiFlexItem>
          <EuiFlexItem grow={dashboardColumnsGrow.third}>
            <div
              css={{
                paddingRight: euiTheme.size.base,
              }}
            >
              <RisksTable
                compact
                data={benchmark.groupedFindingsEvaluation}
                maxItems={3}
                onCellClick={(resourceTypeName) => {
                  const cisSectionEvaluation = benchmark.groupedFindingsEvaluation.find(
                    (groupedFindingsEvaluation) =>
                      groupedFindingsEvaluation.name === resourceTypeName
                  );
                  // if the CIS Section posture score is 100, we should navigate with result evaluation as passed or result evaluation as failed
                  if (
                    cisSectionEvaluation?.postureScore &&
                    Math.trunc(cisSectionEvaluation?.postureScore) === 100
                  ) {
                    navToFailedFindingsByBenchmarkAndSection(
                      benchmark,
                      resourceTypeName,
                      RULE_PASSED
                    );
                  } else {
                    navToFailedFindingsByBenchmarkAndSection(benchmark, resourceTypeName);
                  }
                }}
                viewAllButtonTitle={i18n.translate(
                  'xpack.csp.dashboard.risksTable.benchmarkCardViewAllButtonTitle',
                  {
                    defaultMessage: 'View all failed findings for this benchmark',
                  }
                )}
                onViewAllClick={() => navToFailedFindingsByBenchmark(benchmark)}
              />
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
      ))}
    </EuiPanel>
  );
};
