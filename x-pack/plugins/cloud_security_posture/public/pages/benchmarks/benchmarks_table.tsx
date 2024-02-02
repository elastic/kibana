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
} from '@elastic/eui';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { generatePath } from 'react-router-dom';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { BenchmarkScore, Benchmark, BenchmarksCisId } from '../../../common/types/latest';
import * as TEST_SUBJ from './test_subjects';
import { isCommonError } from '../../components/cloud_posture_page';
import { FullSizeCenteredPage } from '../../components/full_size_centered_page';
import { ComplianceScoreBar } from '../../components/compliance_score_bar';
import { getBenchmarkCisName, getBenchmarkApplicableTo } from '../../../common/utils/helpers';
import { CISBenchmarkIcon } from '../../components/cis_benchmark_icon';
import { benchmarksNavigation } from '../../common/navigation/constants';

export const ERROR_STATE_TEST_SUBJECT = 'benchmark_page_error';

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

export const getBenchmarkPlurals = (benchmarkId: string, accountEvaluation: number) => {
  switch (benchmarkId) {
    case 'cis_k8s':
      return (
        <FormattedMessage
          id="xpack.csp.benchmarks.benchmarksTable.integrationBenchmarkK8sAccountPlural"
          defaultMessage="{accountCount, plural, one {# cluster} other {# clusters}}"
          values={{ accountCount: accountEvaluation || 0 }}
        />
      );
    case 'cis_azure':
      return (
        <FormattedMessage
          id="xpack.csp.benchmarks.benchmarksTable.integrationBenchmarkAzureAccountPlural"
          defaultMessage="{accountCount, plural, one {# subscription} other {# subscriptions}}"
          values={{ accountCount: accountEvaluation || 0 }}
        />
      );
    case 'cis_aws':
      return (
        <FormattedMessage
          id="xpack.csp.benchmarks.benchmarksTable.integrationBenchmarkAwsAccountPlural"
          defaultMessage="{accountCount, plural, one {# account} other {# accounts}}"
          values={{ accountCount: accountEvaluation || 0 }}
        />
      );
    case 'cis_eks':
      return (
        <FormattedMessage
          id="xpack.csp.benchmarks.benchmarksTable.integrationBenchmarkEksAccountPlural"
          defaultMessage="{accountCount, plural, one {# cluster} other {# clusters}}"
          values={{ accountCount: accountEvaluation || 0 }}
        />
      );
    case 'cis_gcp':
      return (
        <FormattedMessage
          id="xpack.csp.benchmarks.benchmarksTable.integrationBenchmarkGcpAccountPlural"
          defaultMessage="{accountCount, plural, one {# project} other {# projects}}"
          values={{ accountCount: accountEvaluation || 0 }}
        />
      );
  }
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

const BENCHMARKS_TABLE_COLUMNS: Array<EuiBasicTableColumn<Benchmark>> = [
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
      return getBenchmarkPlurals(benchmark.id, benchmarkEvaluation);
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
        <FormattedMessage
          id="xpack.csp.benchmarks.benchmarksTable.noFindingsScore"
          defaultMessage="No Findings"
        />
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
      columns={BENCHMARKS_TABLE_COLUMNS}
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
