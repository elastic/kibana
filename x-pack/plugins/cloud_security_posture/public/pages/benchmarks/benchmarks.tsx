/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
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
import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import useDebounce from 'react-use/lib/useDebounce';
import { allNavigationItems } from '../../common/navigation/constants';
import { useCspBreadcrumbs } from '../../common/navigation/use_csp_breadcrumbs';
import { CspPageTemplate } from '../../components/page_template';
import { BenchmarksTable } from './benchmarks_table';
import { ADD_A_CIS_INTEGRATION, BENCHMARK_INTEGRATIONS } from './translations';
import { useCspBenchmarkIntegrations } from './use_csp_benchmark_integrations';
import { pagePathGetters } from '../../../../fleet/public';
import { useKibana } from '../../common/hooks/use_kibana';
import { extractErrorMessage } from '../../../common/utils/helpers';
import { SEARCH_PLACEHOLDER } from './translations';

const integrationPath = pagePathGetters.integrations_all({ searchTerm: 'CIS' }).join('');
const BENCHMARKS_BREADCRUMBS = [allNavigationItems.benchmarks];
const SEARCH_DEBOUNCE_MS = 300;
export const BENCHMARKS_TABLE_DATA_TEST_SUBJ = 'cspBenchmarksTable';

const AddCisIntegrationButton = () => {
  const { http } = useKibana().services;

  return (
    <EuiButton fill iconType="plusInCircle" href={http.basePath.prepend(integrationPath)}>
      {ADD_A_CIS_INTEGRATION}
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
            id="xpack.csp.benchmarks.integrationsNotFoundMessage"
            defaultMessage="No benchmark integrations found"
          />
          {name && (
            <FormattedMessage
              id="xpack.csp.benchmarks.integrationsNotFoundForNameMessage"
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
          id="xpack.csp.benchmarks.integrationsNotFoundWithFiltersMessage"
          defaultMessage="We weren’t able to find any benchmark integrations with the above filters."
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
          placeholder={SEARCH_PLACEHOLDER}
          incremental
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const PAGE_HEADER: EuiPageHeaderProps = {
  pageTitle: BENCHMARK_INTEGRATIONS,
  rightSideItems: [<AddCisIntegrationButton />],
};

export const Benchmarks = () => {
  const [query, setQuery] = useState({ name: '', page: 1, perPage: 5 });

  const queryResult = useCspBenchmarkIntegrations(query);

  useCspBreadcrumbs(BENCHMARKS_BREADCRUMBS);

  const totalItemCount = queryResult.data?.total || 0;

  return (
    <CspPageTemplate pageHeader={PAGE_HEADER}>
      <BenchmarkSearchField
        isLoading={queryResult.isLoading}
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
        data-test-subj={BENCHMARKS_TABLE_DATA_TEST_SUBJ}
        error={queryResult.error ? extractErrorMessage(queryResult.error) : undefined}
        loading={queryResult.isLoading}
        pageIndex={query.page}
        pageSize={query.perPage}
        totalItemCount={totalItemCount}
        setQuery={({ page }) =>
          setQuery((current) => ({ ...current, page: page.index, perPage: page.size }))
        }
        noItemsMessage={
          queryResult.isSuccess && !queryResult.data.total ? (
            <BenchmarkEmptyState name={query.name} />
          ) : undefined
        }
      />
    </CspPageTemplate>
  );
};
