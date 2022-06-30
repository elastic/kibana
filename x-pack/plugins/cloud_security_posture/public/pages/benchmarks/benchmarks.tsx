/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiFieldSearch,
  EuiFieldSearchProps,
  EuiPageHeaderProps,
  EuiButton,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTextColor,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import useDebounce from 'react-use/lib/useDebounce';
import { i18n } from '@kbn/i18n';
import { allNavigationItems } from '../../common/navigation/constants';
import { useCspBreadcrumbs } from '../../common/navigation/use_csp_breadcrumbs';
import { useCISIntegrationLink } from '../../common/navigation/use_navigate_to_cis_integration';
import { CspPageTemplate } from '../../components/csp_page_template';
import { BenchmarksTable } from './benchmarks_table';
import {
  useCspBenchmarkIntegrations,
  UseCspBenchmarkIntegrationsProps,
} from './use_csp_benchmark_integrations';
import { extractErrorMessage } from '../../../common/utils/helpers';
import * as TEST_SUBJ from './test_subjects';

const BENCHMARKS_BREADCRUMBS = [allNavigationItems.benchmarks];
const SEARCH_DEBOUNCE_MS = 300;

const AddCisIntegrationButton = () => {
  const cisIntegrationLink = useCISIntegrationLink();

  return (
    <EuiButton
      data-test-subj={TEST_SUBJ.ADD_INTEGRATION_TEST_SUBJ}
      fill
      iconType="plusInCircle"
      href={cisIntegrationLink}
      isDisabled={!cisIntegrationLink}
    >
      <FormattedMessage
        id="xpack.csp.benchmarks.benchmarksPageHeader.addCisIntegrationButtonLabel"
        defaultMessage="Add a CIS integration"
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

const PAGE_HEADER: EuiPageHeaderProps = {
  'data-test-subj': TEST_SUBJ.BENCHMARKS_PAGE_HEADER,
  pageTitle: i18n.translate(
    'xpack.csp.benchmarks.benchmarksPageHeader.benchmarkIntegrationsTitle',
    { defaultMessage: 'Benchmark Integrations' }
  ),
  rightSideItems: [<AddCisIntegrationButton />],
};

export const Benchmarks = () => {
  const [query, setQuery] = useState<UseCspBenchmarkIntegrationsProps>({
    name: '',
    page: 1,
    perPage: 10,
    sortField: 'package_policy.name',
    sortOrder: 'asc',
  });

  const queryResult = useCspBenchmarkIntegrations(query);

  useCspBreadcrumbs(BENCHMARKS_BREADCRUMBS);

  const totalItemCount = queryResult.data?.total || 0;

  return (
    <CspPageTemplate pageHeader={PAGE_HEADER}>
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
        pageSize={query.perPage}
        sorting={{
          // @ts-expect-error - EUI types currently do not support sorting by nested fields
          sort: { field: query.sortField, direction: query.sortOrder },
          allowNeutralSort: false,
        }}
        totalItemCount={totalItemCount}
        setQuery={({ page, sort }) => {
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
    </CspPageTemplate>
  );
};
