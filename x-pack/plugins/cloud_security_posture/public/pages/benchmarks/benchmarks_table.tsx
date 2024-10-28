/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTable,
  type EuiBasicTableColumn,
  type EuiBasicTableProps,
  type Pagination,
  type CriteriaWithPagination,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiButtonEmpty,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { generatePath } from 'react-router-dom';
import type { BenchmarksCisId } from '@kbn/cloud-security-posture-common';
import { useNavigateFindings } from '@kbn/cloud-security-posture/src/hooks/use_navigate_findings';
import { FINDINGS_GROUPING_OPTIONS } from '../../common/constants';
import type { BenchmarkScore, Benchmark } from '../../../common/types/latest';
import * as TEST_SUBJ from './test_subjects';
import { isCommonError } from '../../components/cloud_posture_page';
import { FullSizeCenteredPage } from '../../components/full_size_centered_page';
import { ComplianceScoreBar } from '../../components/compliance_score_bar';
import { getBenchmarkCisName, getBenchmarkApplicableTo } from '../../../common/utils/helpers';
import { CISBenchmarkIcon } from '../../components/cis_benchmark_icon';
import { benchmarksNavigation } from '../../common/navigation/constants';
import {
  GetBenchmarkDynamicValues,
  useBenchmarkDynamicValues,
} from '../../common/hooks/use_benchmark_dynamic_values';
import { useKibana } from '../../common/hooks/use_kibana';

export const ERROR_STATE_TEST_SUBJECT = 'benchmark_page_error';
export const EMPTY_EVALUATION_TEST_SUBJECT = 'benchmark-not-evaluated-account';
export const EMPTY_SCORE_TEST_SUBJECT = 'benchmark-score-no-findings';

interface BenchmarksTableProps
  extends Pick<EuiBasicTableProps<Benchmark>, 'loading' | 'error' | 'noItemsMessage' | 'sorting'>,
    Pagination {
  benchmarks: Benchmark[];
  setQuery(pagination: CriteriaWithPagination<Benchmark>): void;
  'data-test-subj'?: string;
}

const BenchmarkButtonLink = ({
  benchmarkId,
  benchmarkVersion,
}: {
  benchmarkId: BenchmarksCisId;
  benchmarkVersion: string;
}) => {
  const { application } = useKibana().services;
  return (
    <EuiLink
      href={application?.getUrlForApp('security', {
        path: generatePath(benchmarksNavigation.rules.path, {
          benchmarkVersion,
          benchmarkId,
        }),
      })}
    >
      {getBenchmarkCisName(benchmarkId)}
    </EuiLink>
  );
};

const ErrorMessageComponent = (error: { error: unknown }) => (
  <FullSizeCenteredPage>
    <EuiEmptyPrompt
      color="danger"
      iconType="warning"
      data-test-subj={ERROR_STATE_TEST_SUBJECT}
      title={
        <h2>
          <FormattedMessage
            id="xpack.csp.benchmarks.benchmarksTable.errorRenderer.errorTitle"
            defaultMessage="We couldn't fetch your cloud security posture benchmark data"
          />
        </h2>
      }
      body={
        isCommonError(error) ? (
          <p>
            <FormattedMessage
              id="xpack.csp.benchmarks.benchmarksTable.errorRenderer.errorDescription"
              defaultMessage="{error} {statusCode}: {body}"
              values={{
                error: error.body.error,
                statusCode: error.body.statusCode,
                body: error.body.message,
              }}
            />
          </p>
        ) : undefined
      }
    />
  </FullSizeCenteredPage>
);

const getBenchmarkTableColumns = (
  getBenchmarkDynamicValues: GetBenchmarkDynamicValues,
  navToFindings: any
): Array<EuiBasicTableColumn<Benchmark>> => [
  {
    field: 'id',
    name: i18n.translate('xpack.csp.benchmarks.benchmarksTable.integrationBenchmarkCisName', {
      defaultMessage: 'Benchmark',
    }),
    truncateText: true,
    width: '17.5%',
    sortable: true,
    render: (benchmarkId: Benchmark['id'], benchmark: Benchmark) => (
      <BenchmarkButtonLink
        benchmarkId={benchmarkId || ''}
        benchmarkVersion={benchmark.version || ''}
      />
    ),
    'data-test-subj': TEST_SUBJ.BENCHMARKS_TABLE_COLUMNS.CIS_NAME,
  },
  {
    field: 'version',
    name: i18n.translate('xpack.csp.benchmarks.benchmarksTable.integrationBenchmarkVersion', {
      defaultMessage: 'Version',
    }),
    truncateText: true,
    sortable: true,
    width: '17.5%',
    'data-test-subj': TEST_SUBJ.BENCHMARKS_TABLE_COLUMNS.VERSION,
  },
  {
    field: 'id',
    name: i18n.translate('xpack.csp.benchmarks.benchmarksTable.applicableTo', {
      defaultMessage: 'Applicable To',
    }),
    truncateText: true,
    width: '30%',
    'data-test-subj': TEST_SUBJ.BENCHMARKS_TABLE_COLUMNS.APPLICABLE_TO,
    render: (benchmarkId: BenchmarksCisId) => {
      return (
        <>
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <CISBenchmarkIcon type={benchmarkId} size={'l'} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>{getBenchmarkApplicableTo(benchmarkId)}</EuiFlexItem>
          </EuiFlexGroup>
        </>
      );
    },
  },
  {
    field: 'evaluation',
    name: i18n.translate('xpack.csp.benchmarks.benchmarksTable.evaluated', {
      defaultMessage: 'Evaluated',
    }),
    dataType: 'string',
    truncateText: true,
    width: '17.5%',
    'data-test-subj': TEST_SUBJ.BENCHMARKS_TABLE_COLUMNS.EVALUATED,
    render: (benchmarkEvaluation: Benchmark['evaluation'], benchmark: Benchmark) => {
      const { resourceCountLabel, integrationLink } = getBenchmarkDynamicValues(
        benchmark.id,
        benchmarkEvaluation
      );

      if (benchmarkEvaluation === 0) {
        return (
          <EuiButtonEmpty
            data-test-subj={EMPTY_EVALUATION_TEST_SUBJECT}
            href={integrationLink}
            iconType="plusInCircle"
            flush="left"
          >
            {i18n.translate('xpack.csp.benchmarks.benchmarksTable.addIntegrationTitle', {
              defaultMessage: 'Add {resourceCountLabel}',
              values: { resourceCountLabel },
            })}
          </EuiButtonEmpty>
        );
      }

      const isKspmBenchmark = ['cis_k8s', 'cis_eks'].includes(benchmark.id);
      const groupByField = isKspmBenchmark
        ? FINDINGS_GROUPING_OPTIONS.ORCHESTRATOR_CLUSTER_NAME
        : FINDINGS_GROUPING_OPTIONS.CLOUD_ACCOUNT_NAME;

      return (
        <EuiButtonEmpty
          flush="left"
          onClick={() => {
            navToFindings({ 'rule.benchmark.id': benchmark.id }, [groupByField]);
          }}
        >
          {i18n.translate('xpack.csp.benchmarks.benchmarksTable.accountsCountTitle', {
            defaultMessage: '{benchmarkEvaluation} {resourceCountLabel}',
            values: { benchmarkEvaluation, resourceCountLabel },
          })}
        </EuiButtonEmpty>
      );
    },
  },
  {
    field: 'score',
    name: i18n.translate('xpack.csp.benchmarks.benchmarksTable.score', {
      defaultMessage: 'Compliance',
    }),
    dataType: 'string',
    truncateText: true,
    width: '7.5%',
    'data-test-subj': TEST_SUBJ.BENCHMARKS_TABLE_COLUMNS.COMPLIANCE,
    render: (data: BenchmarkScore) => {
      if (data.totalFindings > 0)
        return (
          <ComplianceScoreBar totalPassed={data?.totalPassed} totalFailed={data?.totalFailed} />
        );

      return (
        <span data-test-subj={EMPTY_SCORE_TEST_SUBJECT}>
          <FormattedMessage
            id="xpack.csp.benchmarks.benchmarksTable.noFindingsScore"
            defaultMessage="No Findings"
          />
        </span>
      );
    },
  },
];

export const BenchmarksTable = ({
  benchmarks,
  pageIndex,
  pageSize,
  totalItemCount,
  loading,
  error,
  setQuery,
  noItemsMessage,
  sorting,
  ...rest
}: BenchmarksTableProps) => {
  const { getBenchmarkDynamicValues } = useBenchmarkDynamicValues();
  const navToFindings = useNavigateFindings();

  const pagination: Pagination = {
    pageIndex: Math.max(pageIndex - 1, 0),
    pageSize,
    totalItemCount,
  };

  const benchmarksSorted = useMemo(() => {
    return [...benchmarks].sort((benchmarkDataA, benchmarkDataB) =>
      benchmarkDataA.id.localeCompare(benchmarkDataB.id)
    );
  }, [benchmarks]);

  const onChange = ({ page }: CriteriaWithPagination<Benchmark>) => {
    setQuery({ page: { ...page, index: page.index + 1 } });
  };

  if (error) {
    return <ErrorMessageComponent error={error} />;
  }

  return (
    <EuiBasicTable
      data-test-subj={rest['data-test-subj']}
      items={benchmarksSorted}
      columns={getBenchmarkTableColumns(getBenchmarkDynamicValues, navToFindings)}
      itemId={(item) => [item.id, item.version].join('/')}
      pagination={pagination}
      onChange={onChange}
      tableLayout="fixed"
      loading={loading}
      noItemsMessage={noItemsMessage}
      error={error}
      /* Disabled Sorting until we have the final Benchmark table */
      // sorting={sorting}
    />
  );
};
