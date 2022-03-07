/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiPageHeaderProps, EuiButton } from '@elastic/eui';
import React from 'react';
import { allNavigationItems } from '../../common/navigation/constants';
import { useCspBreadcrumbs } from '../../common/navigation/use_csp_breadcrumbs';
import { CspPageTemplate } from '../../components/page_template';
import { BenchmarksTable } from './benchmarks_table';
import { ADD_A_CIS_INTEGRATION, BENCHMARK_INTEGRATIONS, LOADING_BENCHMARKS } from './translations';
import { useCspBenchmarkIntegrations } from './use_csp_benchmark_integrations';

const PAGE_HEADER: EuiPageHeaderProps = {
  pageTitle: BENCHMARK_INTEGRATIONS,
  rightSideItems: [
    // TODO: Link this to integrations once we have one
    <EuiButton fill iconType="plusInCircle">
      {ADD_A_CIS_INTEGRATION}
    </EuiButton>,
  ],
};

const BENCHMARKS_BREADCRUMBS = [allNavigationItems.benchmarks];

export const BENCHMARKS_TABLE_DATA_TEST_SUBJ = 'cspBenchmarksTable';
// TODO: Error state
export const BENCHMARKS_ERROR_TEXT = 'TODO: Error state';
const BenchmarksErrorState = () => <div>{BENCHMARKS_ERROR_TEXT}</div>;

export const Benchmarks = () => {
  useCspBreadcrumbs(BENCHMARKS_BREADCRUMBS);
  const query = useCspBenchmarkIntegrations();

  return (
    <CspPageTemplate
      pageHeader={PAGE_HEADER}
      loadingText={LOADING_BENCHMARKS}
      isLoading={query.status === 'loading'}
    >
      {query.status === 'error' && <BenchmarksErrorState />}
      {query.status === 'success' && (
        <BenchmarksTable benchmarks={query.data} data-test-subj={BENCHMARKS_TABLE_DATA_TEST_SUBJ} />
      )}
    </CspPageTemplate>
  );
};
