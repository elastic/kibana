/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { Route, Switch } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FindingsSearchBar } from '../layout/findings_search_bar';
import * as TEST_SUBJECTS from '../test_subjects';
import { useUrlQuery } from '../../../common/hooks/use_url_query';
import type { FindingsBaseProps, FindingsBaseURLQuery } from '../types';
import { FindingsByResourceQuery, useFindingsByResource } from './use_findings_by_resource';
import { FindingsByResourceTable } from './findings_by_resource_table';
import {
  getFindingsPageSizeInfo,
  addFilter,
  getPaginationQuery,
  getPaginationTableParams,
  useBaseEsQuery,
  usePersistedQuery,
} from '../utils';
import { PageTitle, PageTitleText, PageWrapper } from '../layout/findings_layout';
import { FindingsGroupBySelector } from '../layout/findings_group_by_selector';
import { findingsNavigation } from '../../../common/navigation/constants';
import { useCspBreadcrumbs } from '../../../common/navigation/use_csp_breadcrumbs';
import { ResourceFindings } from './resource_findings/resource_findings_container';
import { ErrorCallout } from '../layout/error_callout';
import { FindingsDistributionBar } from '../layout/findings_distribution_bar';

const getDefaultQuery = ({
  query,
  filters,
}: FindingsBaseURLQuery): FindingsBaseURLQuery & FindingsByResourceQuery => ({
  query,
  filters,
  pageIndex: 0,
  pageSize: 10,
  sortDirection: 'desc',
});

export const FindingsByResourceContainer = ({ dataView }: FindingsBaseProps) => (
  <Switch>
    <Route
      exact
      path={findingsNavigation.findings_by_resource.path}
      render={() => <LatestFindingsByResource dataView={dataView} />}
    />
    <Route
      path={findingsNavigation.resource_findings.path}
      render={() => <ResourceFindings dataView={dataView} />}
    />
  </Switch>
);

const LatestFindingsByResource = ({ dataView }: FindingsBaseProps) => {
  useCspBreadcrumbs([findingsNavigation.findings_by_resource]);

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
  const findingsGroupByResource = useFindingsByResource({
    ...getPaginationQuery(urlQuery),
    sortDirection: urlQuery.sortDirection,
    query: baseEsQuery.query,
    enabled: !baseEsQuery.error,
  });

  const error = findingsGroupByResource.error || baseEsQuery.error;

  return (
    <div data-test-subj={TEST_SUBJECTS.FINDINGS_CONTAINER}>
      <FindingsSearchBar
        dataView={dataView}
        setQuery={(query) => {
          setUrlQuery({ ...query, pageIndex: 0 });
        }}
        loading={findingsGroupByResource.isFetching}
      />
      <PageWrapper>
        <PageTitle>
          <PageTitleText
            title={
              <FormattedMessage
                id="xpack.csp.findings.findingsByResource.findingsByResourcePageTitle"
                defaultMessage="Findings"
              />
            }
          />
        </PageTitle>
        {error && <ErrorCallout error={error} />}
        {!error && (
          <>
            <FindingsGroupBySelector type="resource" />
            {findingsGroupByResource.isSuccess && !!findingsGroupByResource.data.page.length && (
              <FindingsDistributionBar
                {...{
                  type: i18n.translate('xpack.csp.findings.findingsByResource.tableRowTypeLabel', {
                    defaultMessage: 'Resources',
                  }),
                  total: findingsGroupByResource.data.total,
                  passed: findingsGroupByResource.data.count.passed,
                  failed: findingsGroupByResource.data.count.failed,
                  ...getFindingsPageSizeInfo({
                    pageIndex: urlQuery.pageIndex,
                    pageSize: urlQuery.pageSize,
                    currentPageSize: findingsGroupByResource.data.page.length,
                  }),
                }}
              />
            )}
            <EuiSpacer />
            <FindingsByResourceTable
              loading={findingsGroupByResource.isFetching}
              items={findingsGroupByResource.data?.page || []}
              pagination={getPaginationTableParams({
                pageSize: urlQuery.pageSize,
                pageIndex: urlQuery.pageIndex,
                totalItemCount: findingsGroupByResource.data?.total || 0,
              })}
              setTableOptions={({ sort, page }) =>
                setUrlQuery({
                  sortDirection: sort?.direction,
                  pageIndex: page.index,
                  pageSize: page.size,
                })
              }
              sorting={{
                sort: { field: 'failed_findings', direction: urlQuery.sortDirection },
              }}
              onAddFilter={(field, value, negate) =>
                setUrlQuery({
                  pageIndex: 0,
                  filters: addFilter({
                    filters: urlQuery.filters,
                    dataView,
                    field,
                    value,
                    negate,
                  }),
                })
              }
            />
          </>
        )}
      </PageWrapper>
    </div>
  );
};
