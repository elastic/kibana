/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiFieldSearch,
  EuiFieldSearchProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageHeader,
  EuiSpacer,
  EuiText,
  EuiTextColor,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import useDebounce from 'react-use/lib/useDebounce';
import { i18n } from '@kbn/i18n';
import { KSPM_POLICY_TEMPLATE } from '../../../common/constants';
import { useCspIntegrationLink } from '../../common/navigation/use_csp_integration_link';
import { CloudPosturePageTitle } from '../../components/cloud_posture_page_title';
import { CloudPosturePage } from '../../components/cloud_posture_page';
import { BenchmarksTable } from './benchmarks_table';
import {
  useCspBenchmarkIntegrations,
  UseCspBenchmarkIntegrationsProps,
} from './use_csp_benchmark_integrations';
import { extractErrorMessage } from '../../../common/utils/helpers';
import * as TEST_SUBJ from './test_subjects';
import { LOCAL_STORAGE_PAGE_SIZE_BENCHMARK_KEY } from '../../common/constants';
import { usePageSize } from '../../common/hooks/use_page_size';

const SEARCH_DEBOUNCE_MS = 300;

// TODO: CIS AWS - add cspm integration button as well
const AddCisIntegrationButton = () => {
  const cisIntegrationLink = useCspIntegrationLink(KSPM_POLICY_TEMPLATE);

  return (
    <EuiButton
      data-test-subj={TEST_SUBJ.ADD_INTEGRATION_TEST_SUBJ}
      fill
      iconType="plusInCircle"
      href={cisIntegrationLink}
      isDisabled={!cisIntegrationLink}
    >
      <FormattedMessage
        id="xpack.csp.benchmarks.benchmarksPageHeader.addKSPMIntegrationButtonLabel"
        defaultMessage="Add a KSPM integration"
      />
    </EuiButton>
  );
};

const BenchmarkEmptyState = ({ name }: { name: string }) => (
  <div>
    <EuiSpacer size="l" />
    {
      <EuiText>
        <strong>
          <FormattedMessage
            id="xpack.csp.benchmarks.benchmarkEmptyState.integrationsNotFoundTitle"
            defaultMessage="No benchmark integrations found"
          />
          {name && (
            <FormattedMessage
              id="xpack.csp.benchmarks.benchmarkEmptyState.integrationsNotFoundForNameTitle"
              defaultMessage=' for "{name}"'
              values={{ name }}
            />
          )}
        </strong>
      </EuiText>
    }
    <EuiSpacer size="s" />
    <EuiText>
      <EuiTextColor color="subdued">
        <FormattedMessage
          id="xpack.csp.benchmarks.benchmarkEmptyState.integrationsNotFoundWithFiltersTitle"
          defaultMessage="We weren't able to find any benchmark integrations with the above filters."
        />
      </EuiTextColor>
    </EuiText>
    <EuiSpacer size="l" />
  </div>
);

const TotalIntegrationsCount = ({
  pageCount,
  totalCount,
}: Record<'pageCount' | 'totalCount', number>) => (
  <EuiText size="xs" style={{ marginLeft: 8 }}>
    <EuiTextColor color="subdued">
      <FormattedMessage
        id="xpack.csp.benchmarks.totalIntegrationsCountMessage"
        defaultMessage="Showing {pageCount} of {totalCount, plural, one {# integration} other {# integrations}}"
        values={{ pageCount, totalCount }}
      />
    </EuiTextColor>
  </EuiText>
);

const BenchmarkSearchField = ({
  onSearch,
  isLoading,
}: Required<Pick<EuiFieldSearchProps, 'isLoading' | 'onSearch'>>) => {
  const [localValue, setLocalValue] = useState('');

  useDebounce(() => onSearch(localValue), SEARCH_DEBOUNCE_MS, [localValue]);

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={true} style={{ alignItems: 'flex-end' }}>
        <EuiFieldSearch
          onSearch={setLocalValue}
          isLoading={isLoading}
          placeholder={i18n.translate(
            'xpack.csp.benchmarks.benchmarkSearchField.searchPlaceholder',
            { defaultMessage: 'e.g. benchmark name' }
          )}
          incremental
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const Benchmarks = () => {
  const { pageSize, setPageSize } = usePageSize(LOCAL_STORAGE_PAGE_SIZE_BENCHMARK_KEY);
  const [query, setQuery] = useState<UseCspBenchmarkIntegrationsProps>({
    name: '',
    page: 1,
    perPage: pageSize,
    sortField: 'package_policy.name',
    sortOrder: 'asc',
  });

  const queryResult = useCspBenchmarkIntegrations(query);
  const totalItemCount = queryResult.data?.total || 0;

  return (
    <CloudPosturePage>
      <EuiPageHeader
        data-test-subj={TEST_SUBJ.BENCHMARKS_PAGE_HEADER}
        pageTitle={
          <CloudPosturePageTitle
            title={i18n.translate(
              'xpack.csp.benchmarks.benchmarksPageHeader.benchmarkIntegrationsTitle',
              { defaultMessage: 'Benchmark Integrations' }
            )}
          />
        }
        rightSideItems={[<AddCisIntegrationButton />]}
        bottomBorder
      />
      <EuiSpacer />
      <BenchmarkSearchField
        isLoading={queryResult.isFetching}
        onSearch={(name) => setQuery((current) => ({ ...current, name }))}
      />
      <EuiSpacer />
      <TotalIntegrationsCount
        pageCount={(queryResult.data?.items || []).length}
        totalCount={totalItemCount}
      />
      <EuiSpacer size="s" />
      <BenchmarksTable
        benchmarks={queryResult.data?.items || []}
        data-test-subj={TEST_SUBJ.BENCHMARKS_TABLE_DATA_TEST_SUBJ}
        error={queryResult.error ? extractErrorMessage(queryResult.error) : undefined}
        loading={queryResult.isFetching}
        pageIndex={query.page}
        pageSize={pageSize || query.perPage}
        sorting={{
          // @ts-expect-error - EUI types currently do not support sorting by nested fields
          sort: { field: query.sortField, direction: query.sortOrder },
          allowNeutralSort: false,
        }}
        totalItemCount={totalItemCount}
        setQuery={({ page, sort }) => {
          setPageSize(page.size);
          setQuery((current) => ({
            ...current,
            page: page.index,
            perPage: page.size,
            sortField:
              (sort?.field as UseCspBenchmarkIntegrationsProps['sortField']) || current.sortField,
            sortOrder: sort?.direction || current.sortOrder,
          }));
        }}
        noItemsMessage={
          queryResult.isSuccess && !queryResult.data.total ? (
            <BenchmarkEmptyState name={query.name} />
          ) : undefined
        }
      />
    </CloudPosturePage>
  );
};
