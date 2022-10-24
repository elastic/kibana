/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { Route, Switch } from 'react-router-dom';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import type { Evaluation } from '../../../../common/types';
import { CloudPosturePageTitle } from '../../../components/cloud_posture_page_title';
import { FindingsSearchBar } from '../layout/findings_search_bar';
import * as TEST_SUBJECTS from '../test_subjects';
import { useUrlQuery } from '../../../common/hooks/use_url_query';
import type { FindingsBaseProps, FindingsBaseURLQuery } from '../types';
import { FindingsByResourceQuery, useFindingsByResource } from './use_findings_by_resource';
import { FindingsByResourceTable } from './findings_by_resource_table';
import {
  getFindingsPageSizeInfo,
  getFilters,
  getPaginationQuery,
  getPaginationTableParams,
  useBaseEsQuery,
  usePersistedQuery,
} from '../utils/utils';
import { PageTitle, PageTitleText } from '../layout/findings_layout';
import { FindingsGroupBySelector } from '../layout/findings_group_by_selector';
import { findingsNavigation } from '../../../common/navigation/constants';
import { ResourceFindings } from './resource_findings/resource_findings_container';
import { ErrorCallout } from '../layout/error_callout';
import { FindingsDistributionBar } from '../layout/findings_distribution_bar';
import { LOCAL_STORAGE_PAGE_SIZE_FINDINGS_BY_RESOURCE_KEY } from '../../../../common/constants';

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
  const getPersistedDefaultQuery = usePersistedQuery(getDefaultQuery);
  const { urlQuery, setUrlQuery } = useUrlQuery(getPersistedDefaultQuery);
  const [pageSizes, setPageSize] = useLocalStorage(
    LOCAL_STORAGE_PAGE_SIZE_FINDINGS_BY_RESOURCE_KEY,
    urlQuery.pageSize
  );

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
    ...getPaginationQuery({
      pageIndex: urlQuery.pageIndex,
      pageSize: pageSizes || urlQuery.pageSize,
    }),
    sortDirection: urlQuery.sortDirection,
    query: baseEsQuery.query,
    enabled: !baseEsQuery.error,
  });

  const error = findingsGroupByResource.error || baseEsQuery.error;

  const handleDistributionClick = (evaluation: Evaluation) => {
    setUrlQuery({
      pageIndex: 0,
      filters: getFilters({
        filters: urlQuery.filters,
        dataView,
        field: 'result.evaluation',
        value: evaluation,
        negate: false,
      }),
    });
  };

  return (
    <div data-test-subj={TEST_SUBJECTS.FINDINGS_CONTAINER}>
      <FindingsSearchBar
        dataView={dataView}
        setQuery={(query) => {
          setUrlQuery({ ...query, pageIndex: 0 });
        }}
        loading={findingsGroupByResource.isFetching}
      />
      <EuiFlexGroup>
        <EuiFlexItem>
          <PageTitle>
            <PageTitleText
              title={
                <CloudPosturePageTitle
                  title={i18n.translate(
                    'xpack.csp.findings.findingsByResource.findingsByResourcePageTitle',
                    { defaultMessage: 'Findings' }
                  )}
                />
              }
            />
          </PageTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ width: 400 }}>
          {!error && <FindingsGroupBySelector type="resource" />}
        </EuiFlexItem>
      </EuiFlexGroup>
      {error && <ErrorCallout error={error} />}
      {!error && (
        <>
          {findingsGroupByResource.isSuccess && !!findingsGroupByResource.data.page.length && (
            <FindingsDistributionBar
              {...{
                distributionOnClick: handleDistributionClick,
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
              pageSize: pageSizes || urlQuery.pageSize,
              pageIndex: urlQuery.pageIndex,
              totalItemCount: findingsGroupByResource.data?.total || 0,
            })}
            setTableOptions={({ sort, page }) => {
              setPageSize(page.size);
              setUrlQuery({
                sortDirection: sort?.direction,
                pageIndex: page.index,
                pageSize: page.size,
              });
            }}
            sorting={{
              sort: { field: 'failed_findings', direction: urlQuery.sortDirection },
            }}
            onAddFilter={(field, value, negate) =>
              setUrlQuery({
                pageIndex: 0,
                filters: getFilters({
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
    </div>
  );
};
