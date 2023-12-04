/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { Routes, Route } from '@kbn/shared-ux-router';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import { CspFinding } from '../../../../common/schemas/csp_finding';
import type { Evaluation } from '../../../../common/types';
import { FindingsSearchBar } from '../layout/findings_search_bar';
import * as TEST_SUBJECTS from '../test_subjects';
import { usePageSlice } from '../../../common/hooks/use_page_slice';
import { FindingsByResourceQuery, useFindingsByResource } from './use_findings_by_resource';
import { FindingsByResourceTable } from './findings_by_resource_table';
import { getFilters } from '../utils/utils';
import { LimitedResultsBar } from '../layout/findings_layout';
import { FindingsGroupBySelector } from '../layout/findings_group_by_selector';
import { findingsNavigation } from '../../../common/navigation/constants';
import { ResourceFindings } from './resource_findings/resource_findings_container';
import { ErrorCallout } from '../layout/error_callout';
import { CurrentPageOfTotal, FindingsDistributionBar } from '../layout/findings_distribution_bar';
import { LOCAL_STORAGE_PAGE_SIZE_FINDINGS_KEY } from '../../../common/constants';
import type { FindingsBaseURLQuery, FindingsBaseProps } from '../../../common/types';
import { useCloudPostureTable } from '../../../common/hooks/use_cloud_posture_table';
import { useLimitProperties } from '../../../common/utils/get_limit_properties';
import { getPaginationTableParams } from '../../../common/hooks/use_cloud_posture_table/utils';

const getDefaultQuery = ({
  query,
  filters,
}: FindingsBaseURLQuery): FindingsBaseURLQuery & FindingsByResourceQuery => ({
  query,
  filters,
  pageIndex: 0,
  sort: { field: 'compliance_score' as keyof CspFinding, direction: 'asc' },
});

/**
 * @deprecated: This component is deprecated and will be removed in the next release.
 */
export const FindingsByResourceContainer = ({ dataView }: FindingsBaseProps) => (
  <Routes>
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
  </Routes>
);

/**
 * @deprecated: This component is deprecated and will be removed in the next release.
 */
const LatestFindingsByResource = ({ dataView }: FindingsBaseProps) => {
  const { queryError, query, pageSize, setTableOptions, urlQuery, setUrlQuery, onResetFilters } =
    useCloudPostureTable({
      dataView,
      defaultQuery: getDefaultQuery,
      paginationLocalStorageKey: LOCAL_STORAGE_PAGE_SIZE_FINDINGS_KEY,
    });

  /**
   * Page ES query result
   */
  const findingsGroupByResource = useFindingsByResource({
    sortDirection: urlQuery.sort.direction,
    query,
    enabled: !queryError,
  });

  const error = findingsGroupByResource.error || queryError;

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
    <div data-test-subj={TEST_SUBJECTS.FINDINGS_BY_RESOURCE_CONTAINER}>
      <FindingsSearchBar
        dataView={dataView!}
        setQuery={(newQuery) => {
          setUrlQuery({ ...newQuery, pageIndex: 0 });
        }}
        loading={findingsGroupByResource.isFetching}
      />
      <EuiSpacer size="m" />

      {error && <ErrorCallout error={error} />}
      {!error && (
        <>
          {findingsGroupByResource.isSuccess && !!findingsGroupByResource.data.page.length && (
            <>
              <FindingsDistributionBar
                {...{
                  distributionOnClick: handleDistributionClick,
                  type: i18n.translate('xpack.csp.findings.findingsByResource.tableRowTypeLabel', {
                    defaultMessage: 'Resources',
                  }),
                  passed: findingsGroupByResource.data.count.passed,
                  failed: findingsGroupByResource.data.count.failed,
                }}
              />
              <EuiSpacer size="l" />
              <EuiFlexGroup alignItems="center">
                <EuiFlexItem grow={false}>
                  <CurrentPageOfTotal
                    pageStart={urlQuery.pageIndex * pageSize + 1}
                    pageEnd={urlQuery.pageIndex * pageSize + slicedPage.length}
                    total={findingsGroupByResource.data.total}
                    type={i18n.translate(
                      'xpack.csp.findings.findingsByResource.tableRowTypeLabel',
                      {
                        defaultMessage: 'Resources',
                      }
                    )}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false} style={{ width: 188, marginLeft: 'auto' }}>
                  <FindingsGroupBySelector type="resource" />
                </EuiFlexItem>
              </EuiFlexGroup>
            </>
          )}
          <EuiSpacer />
          <FindingsByResourceTable
            loading={findingsGroupByResource.isFetching}
            items={slicedPage}
            onResetFilters={onResetFilters}
            pagination={getPaginationTableParams({
              pageSize,
              pageIndex: urlQuery.pageIndex,
              totalItemCount: limitedTotalItemCount,
            })}
            setTableOptions={setTableOptions}
            sorting={{
              sort: { field: 'compliance_score', direction: urlQuery.sort.direction },
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
