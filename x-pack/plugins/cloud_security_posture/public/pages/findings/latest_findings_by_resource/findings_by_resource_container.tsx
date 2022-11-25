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
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import type { Evaluation } from '../../../../common/types';
import { CloudPosturePageTitle } from '../../../components/cloud_posture_page_title';
import { FindingsSearchBar } from '../layout/findings_search_bar';
import * as TEST_SUBJECTS from '../test_subjects';
import { useUrlQuery } from '../../../common/hooks/use_url_query';
import { usePageSlice } from '../../../common/hooks/use_page_slice';
import { usePageSize } from '../../../common/hooks/use_page_size';
import type { FindingsBaseProps, FindingsBaseURLQuery } from '../types';
import { FindingsByResourceQuery, useFindingsByResource } from './use_findings_by_resource';
import { FindingsByResourceTable } from './findings_by_resource_table';
import {
  getFindingsPageSizeInfo,
  getFilters,
  getPaginationTableParams,
  useBaseEsQuery,
  usePersistedQuery,
} from '../utils/utils';
import { LimitedResultsBar, PageTitle, PageTitleText } from '../layout/findings_layout';
import { FindingsGroupBySelector } from '../layout/findings_group_by_selector';
import { findingsNavigation } from '../../../common/navigation/constants';
import { ResourceFindings } from './resource_findings/resource_findings_container';
import { ErrorCallout } from '../layout/error_callout';
import { FindingsDistributionBar } from '../layout/findings_distribution_bar';
import { LOCAL_STORAGE_PAGE_SIZE_FINDINGS_KEY } from '../../../common/constants';
import { useLimitProperties } from '../utils/get_limit_properties';

const getDefaultQuery = ({
  query,
  filters,
}: FindingsBaseURLQuery): FindingsBaseURLQuery & FindingsByResourceQuery => ({
  query,
  filters,
  pageIndex: 0,
  sortDirection: 'desc',
});

export const FindingsByResourceContainer = ({ dataView }: FindingsBaseProps) => (
  <Switch>
    <Route
      exact
      path={findingsNavigation.findings_by_resource.path}
      render={() => (
        <TrackApplicationView viewId={findingsNavigation.findings_by_resource.id}>
          <LatestFindingsByResource dataView={dataView} />
        </TrackApplicationView>
      )}
    />
    <Route
      path={findingsNavigation.resource_findings.path}
      render={() => (
        <TrackApplicationView viewId={findingsNavigation.resource_findings.id}>
          <ResourceFindings dataView={dataView} />
        </TrackApplicationView>
      )}
    />
  </Switch>
);

const LatestFindingsByResource = ({ dataView }: FindingsBaseProps) => {
  const getPersistedDefaultQuery = usePersistedQuery(getDefaultQuery);
  const { urlQuery, setUrlQuery } = useUrlQuery(getPersistedDefaultQuery);
  const { pageSize, setPageSize } = usePageSize(LOCAL_STORAGE_PAGE_SIZE_FINDINGS_KEY);

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
    sortDirection: urlQuery.sortDirection,
    query: baseEsQuery.query,
    enabled: !baseEsQuery.error,
  });

  const error = findingsGroupByResource.error || baseEsQuery.error;

  const slicedPage = usePageSlice(findingsGroupByResource.data?.page, urlQuery.pageIndex, pageSize);

  const { isLastLimitedPage, limitedTotalItemCount } = useLimitProperties({
    total: findingsGroupByResource.data?.total,
    pageIndex: urlQuery.pageIndex,
    pageSize,
  });

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
                  pageSize,
                  currentPageSize: slicedPage.length,
                }),
              }}
            />
          )}
          <EuiSpacer />
          <FindingsByResourceTable
            loading={findingsGroupByResource.isFetching}
            items={slicedPage}
            pagination={getPaginationTableParams({
              pageSize,
              pageIndex: urlQuery.pageIndex,
              totalItemCount: limitedTotalItemCount,
            })}
            setTableOptions={({ sort, page }) => {
              setPageSize(page.size);
              setUrlQuery({
                sortDirection: sort?.direction,
                pageIndex: page.index,
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
      {isLastLimitedPage && <LimitedResultsBar />}
    </div>
  );
};
