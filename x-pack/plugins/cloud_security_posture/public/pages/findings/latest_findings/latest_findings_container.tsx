/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSpacer } from '@elastic/eui';
import type { FindingsBaseProps } from '../types';
import { FindingsTable } from './latest_findings_table';
import { FindingsSearchBar } from '../layout/findings_search_bar';
import * as TEST_SUBJECTS from '../test_subjects';
import { useLatestFindings } from './use_latest_findings';
import type { FindingsGroupByNoneQuery } from './use_latest_findings';
import type { FindingsBaseURLQuery } from '../types';
import { FindingsDistributionBar } from '../layout/findings_distribution_bar';
import {
  getPaginationQuery,
  getPaginationTableParams,
  useBaseEsQuery,
  usePersistedQuery,
} from '../utils';
import { PageWrapper, PageTitle, PageTitleText } from '../layout/findings_layout';
import { FindingsGroupBySelector } from '../layout/findings_group_by_selector';
import { useCspBreadcrumbs } from '../../../common/navigation/use_csp_breadcrumbs';
import { findingsNavigation } from '../../../common/navigation/constants';
import { useUrlQuery } from '../../../common/hooks/use_url_query';
import { ErrorCallout } from '../layout/error_callout';

export const getDefaultQuery = ({
  query,
  filters,
}: FindingsBaseURLQuery): FindingsBaseURLQuery & FindingsGroupByNoneQuery => ({
  query,
  filters,
  sort: { field: '@timestamp', direction: 'desc' },
  pageIndex: 0,
  pageSize: 10,
});

export const LatestFindingsContainer = ({ dataView }: FindingsBaseProps) => {
  useCspBreadcrumbs([findingsNavigation.findings_default]);

  const getPersistedDefaultQuery = usePersistedQuery(getDefaultQuery);
  const { urlQuery, setUrlQuery } = useUrlQuery(getPersistedDefaultQuery);

  /**
   * Page URL query to ES query
   */
  const baseEsQuery = useBaseEsQuery({
    dataView,
    filters: urlQuery.filters,
    query: urlQuery.query,
  });

  /**
   * Page ES query result
   */
  const findingsGroupByNone = useLatestFindings({
    ...getPaginationQuery({ pageIndex: urlQuery.pageIndex, pageSize: urlQuery.pageSize }),
    query: baseEsQuery.query,
    sort: urlQuery.sort,
    enabled: !baseEsQuery.error,
  });

  const error = findingsGroupByNone.error || baseEsQuery.error;

  return (
    <div data-test-subj={TEST_SUBJECTS.FINDINGS_CONTAINER}>
      <FindingsSearchBar
        dataView={dataView}
        setQuery={(query) => {
          setUrlQuery({ ...query, pageIndex: 0 });
        }}
        loading={findingsGroupByNone.isFetching}
      />
      <PageWrapper>
        <LatestFindingsPageTitle />
        {error && <ErrorCallout error={error} />}
        {!error && (
          <>
            <FindingsGroupBySelector type="default" />
            {findingsGroupByNone.isSuccess && (
              <FindingsDistributionBar
                {...{
                  total: findingsGroupByNone.data.total,
                  passed: findingsGroupByNone.data.count.passed,
                  failed: findingsGroupByNone.data.count.failed,
                  ...getFindingsPageSizeInfo({
                    pageIndex: urlQuery.pageIndex,
                    pageSize: urlQuery.pageSize,
                    currentPageSize: findingsGroupByNone.data.page.length,
                  }),
                }}
              />
            )}
            <EuiSpacer />
            <FindingsTable
              loading={findingsGroupByNone.isFetching}
              items={findingsGroupByNone.data?.page || []}
              pagination={getPaginationTableParams({
                pageSize: urlQuery.pageSize,
                pageIndex: urlQuery.pageIndex,
                totalItemCount: findingsGroupByNone.data?.total || 0,
              })}
              sorting={{
                sort: { field: urlQuery.sort.field, direction: urlQuery.sort.direction },
              }}
              setTableOptions={({ page, sort }) =>
                setUrlQuery({
                  sort,
                  pageIndex: page.index,
                  pageSize: page.size,
                })
              }
            />
          </>
        )}
      </PageWrapper>
    </div>
  );
};

const LatestFindingsPageTitle = () => (
  <PageTitle>
    <PageTitleText
      title={
        <FormattedMessage
          id="xpack.csp.findings.latestFindings.latestFindingsPageTitle"
          defaultMessage="Findings"
        />
      }
    />
  </PageTitle>
);

const getFindingsPageSizeInfo = ({
  currentPageSize,
  pageIndex,
  pageSize,
}: Record<'pageIndex' | 'pageSize' | 'currentPageSize', number>) => ({
  pageStart: pageIndex * pageSize + 1,
  pageEnd: pageIndex * pageSize + currentPageSize,
});
