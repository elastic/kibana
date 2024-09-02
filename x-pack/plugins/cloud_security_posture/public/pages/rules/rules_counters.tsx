/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useParams } from 'react-router-dom';
import { Chart, Partition, PartitionLayout, Settings } from '@elastic/charts';
import { FormattedMessage } from '@kbn/i18n-react';
import { useBenchmarkDynamicValues } from '../../common/hooks/use_benchmark_dynamic_values';
import { getPostureScorePercentage } from '../compliance_dashboard/compliance_charts/compliance_score_chart';
import { RULE_COUNTERS_TEST_SUBJ } from './test_subjects';
import noDataIllustration from '../../assets/illustrations/no_data_illustration.svg';
import { useNavigateFindings } from '../../common/hooks/use_navigate_findings';
import { cloudPosturePages } from '../../common/navigation/constants';
import { RULE_FAILED, RULE_PASSED } from '../../../common/constants';
import { statusColors } from '../../common/constants';
import { useCspBenchmarkIntegrationsV2 } from '../benchmarks/use_csp_benchmark_integrations';
import { CspCounterCard } from '../../components/csp_counter_card';
import { useKibana } from '../../common/hooks/use_kibana';

const EvaluationPieChart = ({ failed, passed }: { failed: number; passed: number }) => {
  const {
    services: { charts },
  } = useKibana();

  return (
    <Chart size={{ height: 30, width: 30 }}>
      <Settings
        theme={[
          {
            partition: {
              outerSizeRatio: 0.75,
              emptySizeRatio: 0.7,
            },
          },
        ]}
        baseTheme={charts.theme.useChartsBaseTheme()}
      />
      <Partition
        id={'evaluation-pie-chart'}
        data={[
          {
            label: i18n.translate('xpack.csp.rulesPage.evaluationPieChart.failedTitle', {
              defaultMessage: 'Failed',
            }),
            value: failed,
          },
          {
            label: i18n.translate('xpack.csp.rulesPage.evaluationPieChart.passedTitle', {
              defaultMessage: 'Passed',
            }),
            value: passed,
          },
        ]}
        valueGetter="percent"
        valueAccessor={(d) => d.value}
        layout={PartitionLayout.sunburst}
        layers={[
          {
            // grouping the pie chart by data labels and coloring the group by the label value
            groupByRollup: (d: { label: string }) => d.label,
            shape: {
              fillColor: (label) =>
                label.toLowerCase() === RULE_PASSED.toLowerCase()
                  ? statusColors.passed
                  : statusColors.failed,
            },
          },
        ]}
      />
    </Chart>
  );
};

export const RulesCounters = ({
  mutedRulesCount,
  setEnabledDisabledItemsFilter,
}: {
  mutedRulesCount: number;
  setEnabledDisabledItemsFilter: (filterState: string) => void;
}) => {
  const { http } = useKibana().services;
  const { getBenchmarkDynamicValues } = useBenchmarkDynamicValues();
  const rulesPageParams = useParams<{ benchmarkId: string; benchmarkVersion: string }>();
  const getBenchmarks = useCspBenchmarkIntegrationsV2();
  const navToFindings = useNavigateFindings();

  const benchmarkRulesStats = getBenchmarks.data?.items.find(
    (benchmark) =>
      benchmark.id === rulesPageParams.benchmarkId &&
      benchmark.version === rulesPageParams.benchmarkVersion
  );

  if (!benchmarkRulesStats) {
    return <></>;
  }

  const benchmarkValues = getBenchmarkDynamicValues(benchmarkRulesStats.id);

  if (benchmarkRulesStats.score.totalFindings === 0) {
    return (
      <EuiEmptyPrompt
        data-test-subj={RULE_COUNTERS_TEST_SUBJ.RULE_COUNTERS_EMPTY_STATE}
        color="plain"
        icon={
          <EuiImage
            size="fullWidth"
            src={noDataIllustration}
            alt={i18n.translate(
              'xpack.csp.rulesPage.rulesCounterEmptyState.noDataIllustrationAlt',
              { defaultMessage: 'No data illustration' }
            )}
          />
        }
        title={
          <h2>
            <FormattedMessage
              id="xpack.csp.rulesPage.rulesCounterEmptyState.emptyStateTitle"
              defaultMessage="Add {integrationResourceName} to get started"
              values={{
                integrationResourceName: `${benchmarkValues.integrationName}
                  ${benchmarkValues.resourceName}`,
              }}
            />
          </h2>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.csp.rulesPage.rulesCounterEmptyState.emptyStateDescription"
              defaultMessage="Add your {resourceName} in {integrationType} to begin detecing misconfigurations"
              values={{
                resourceName: benchmarkValues.resourceName.toLowerCase(),
                integrationType: benchmarkValues.integrationType,
              }}
            />
          </p>
        }
        actions={[
          <EuiButton color="primary" fill href={benchmarkValues.integrationLink}>
            <FormattedMessage
              id="xpack.csp.rulesPage.rulesCounterEmptyState.emptyPrimapryButtonTitle"
              defaultMessage="Add {integrationType} integration"
              values={{
                integrationType: benchmarkValues.integrationType,
              }}
            />
          </EuiButton>,
          <EuiButtonEmpty color="primary" href={benchmarkValues.learnMoreLink} target="_blank">
            <FormattedMessage
              id="xpack.csp.rulesPage.rulesCounterEmptyState.emptyLearnMoreButtonTitle"
              defaultMessage="Learn more"
            />
          </EuiButtonEmpty>,
        ]}
        layout="horizontal"
        paddingSize="m"
      />
    );
  }

  const counters = [
    {
      id: RULE_COUNTERS_TEST_SUBJ.POSTURE_SCORE_COUNTER,
      description: i18n.translate('xpack.csp.rulesCounters.postureScoreTitle', {
        defaultMessage: 'Posture Score',
      }),
      title: (
        <EuiFlexGroup alignItems="center" gutterSize="none">
          <EuiFlexItem grow={false}>
            <EvaluationPieChart
              failed={benchmarkRulesStats.score.totalFailed}
              passed={benchmarkRulesStats.score.totalPassed}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            {getPostureScorePercentage(benchmarkRulesStats.score.postureScore)}
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
      button: (
        <EuiButtonEmpty
          data-test-subj={RULE_COUNTERS_TEST_SUBJ.POSTURE_SCORE_BUTTON}
          iconType="pivot"
          href={http.basePath.prepend(`/app/security${cloudPosturePages.dashboard.path}`)}
        >
          {i18n.translate('xpack.csp.rulesCounters.postureScoreButton', {
            defaultMessage: 'Dashboard',
          })}
        </EuiButtonEmpty>
      ),
    },
    {
      id: RULE_COUNTERS_TEST_SUBJ.INTEGRATIONS_EVALUATED_COUNTER,
      description: i18n.translate('xpack.csp.rulesCounters.accountsEvaluatedTitle', {
        defaultMessage: '{resourceName} Evaluated',
        values: {
          resourceName: benchmarkValues.resourceName,
        },
      }),
      title: benchmarkRulesStats.evaluation || 0,
      button: (
        <EuiButtonEmpty
          data-test-subj={RULE_COUNTERS_TEST_SUBJ.INTEGRATIONS_EVALUATED_BUTTON}
          iconType="listAdd"
          href={benchmarkValues.integrationLink}
        >
          {i18n.translate('xpack.csp.rulesCounters.accountsEvaluatedButton', {
            defaultMessage: 'Add more {resourceName}',
            values: {
              resourceName: benchmarkValues.resourceName.toLowerCase(),
            },
          })}
        </EuiButtonEmpty>
      ),
    },
    {
      id: RULE_COUNTERS_TEST_SUBJ.FAILED_FINDINGS_COUNTER,
      description: i18n.translate('xpack.csp.rulesCounters.failedFindingsTitle', {
        defaultMessage: 'Failed Findings',
      }),
      title: benchmarkRulesStats.score.totalFailed,
      titleColor: benchmarkRulesStats.score.totalFailed > 0 ? statusColors.failed : undefined,
      button: (
        <EuiButtonEmpty
          data-test-subj={RULE_COUNTERS_TEST_SUBJ.FAILED_FINDINGS_BUTTON}
          iconType="pivot"
          onClick={() =>
            navToFindings({
              'result.evaluation': RULE_FAILED,
              'rule.benchmark.id': benchmarkRulesStats.id || '',
              'rule.benchmark.version': `v${benchmarkRulesStats.version}`,
            })
          }
        >
          {i18n.translate('xpack.csp.rulesCounters.failedFindingsButton', {
            defaultMessage: 'View all failed findings',
          })}
        </EuiButtonEmpty>
      ),
    },
    {
      id: RULE_COUNTERS_TEST_SUBJ.DISABLED_RULES_COUNTER,
      description: i18n.translate('xpack.csp.rulesCounters.disabledRulesCounterTitle', {
        defaultMessage: 'Disabled Rules',
      }),
      title: mutedRulesCount,
      button: (
        <EuiButtonEmpty
          data-test-subj={RULE_COUNTERS_TEST_SUBJ.DISABLED_RULES_BUTTON}
          iconType="search"
          onClick={() => setEnabledDisabledItemsFilter('disabled')}
        >
          {i18n.translate('xpack.csp.rulesCounters.disabledRulesCounterButton', {
            defaultMessage: 'View all disabled rules',
          })}
        </EuiButtonEmpty>
      ),
    },
  ];

  return (
    <EuiFlexGroup wrap={true}>
      {counters.map((counter) => (
        <EuiFlexItem key={counter.id}>
          <CspCounterCard {...counter} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
