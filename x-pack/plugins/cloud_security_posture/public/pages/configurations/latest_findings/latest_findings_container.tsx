/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Evaluation } from '../../../../common/types';
import type { FindingsBaseProps, FindingsBaseURLQuery } from '../../../common/types';
import { FindingsTable } from './latest_findings_table';
import { FindingsSearchBar } from '../layout/findings_search_bar';
import * as TEST_SUBJECTS from '../test_subjects';
import { useLatestFindings } from './use_latest_findings';
import type { FindingsGroupByNoneQuery } from './use_latest_findings';
import { FindingsDistributionBar } from '../layout/findings_distribution_bar';
import { getFindingsPageSizeInfo, getFilters } from '../utils/utils';
import { LimitedResultsBar } from '../layout/findings_layout';
import { FindingsGroupBySelector } from '../layout/findings_group_by_selector';
import { usePageSlice } from '../../../common/hooks/use_page_slice';
import { ErrorCallout } from '../layout/error_callout';
import { useLimitProperties } from '../../../common/utils/get_limit_properties';
import { LOCAL_STORAGE_PAGE_SIZE_FINDINGS_KEY } from '../../../common/constants';
import { CspFinding } from '../../../../common/schemas/csp_finding';
import { useCloudPostureTable } from '../../../common/hooks/use_cloud_posture_table';
import { getPaginationTableParams } from '../../../common/hooks/use_cloud_posture_table/utils';

export const getDefaultQuery = ({
  query,
  filters,
}: FindingsBaseURLQuery): FindingsBaseURLQuery &
  FindingsGroupByNoneQuery & { findingIndex: number } => ({
  query,
  filters,
  sort: { field: '@timestamp', direction: 'desc' },
  pageIndex: 0,
  findingIndex: -1,
});

export const LatestFindingsContainer = ({ dataView }: FindingsBaseProps) => {
  const {
    pageIndex,
    query,
    sort,
    queryError,
    pageSize,
    setTableOptions,
    urlQuery,
    setUrlQuery,
    filters,
    onResetFilters,
  } = useCloudPostureTable({
    dataView,
    defaultQuery: getDefaultQuery,
    paginationLocalStorageKey: LOCAL_STORAGE_PAGE_SIZE_FINDINGS_KEY,
  });

  /**
   * Page ES query result
   */
  const findingsGroupByNone = useLatestFindings({
    query,
    sort,
    enabled: !queryError,
  });

  const slicedPage = usePageSlice(findingsGroupByNone.data?.page, pageIndex, pageSize);

  const error = findingsGroupByNone.error || queryError;

  const { isLastLimitedPage, limitedTotalItemCount } = useLimitProperties({
    total: findingsGroupByNone.data?.total,
    pageIndex,
    pageSize,
  });

  const handleDistributionClick = (evaluation: Evaluation) => {
    setUrlQuery({
      pageIndex: 0,
      filters: getFilters({
        filters,
        dataView,
        field: 'result.evaluation',
        value: evaluation,
        negate: false,
      }),
    });
  };

  const flyoutFindingIndex = urlQuery?.findingIndex;

  const pagination = getPaginationTableParams({
    pageSize,
    pageIndex,
    totalItemCount: limitedTotalItemCount,
  });

  const onOpenFlyout = useCallback(
    (flyoutFinding: CspFinding) => {
      setUrlQuery({
        findingIndex: slicedPage.findIndex(
          (finding) =>
            finding.resource.id === flyoutFinding?.resource.id &&
            finding.rule.id === flyoutFinding?.rule.id
        ),
      });
    },
    [slicedPage, setUrlQuery]
  );

  const onCloseFlyout = () =>
    setUrlQuery({
      findingIndex: -1,
    });

  const onPaginateFlyout = useCallback(
    (nextFindingIndex: number) => {
      // the index of the finding in the current page
      const newFindingIndex = nextFindingIndex % pageSize;

      // if the finding is not in the current page, we need to change the page
      const flyoutPageIndex = Math.floor(nextFindingIndex / pageSize);

      setUrlQuery({
        pageIndex: flyoutPageIndex,
        findingIndex: newFindingIndex,
      });
    },
    [pageSize, setUrlQuery]
  );

  return (
    <div data-test-subj={TEST_SUBJECTS.LATEST_FINDINGS_CONTAINER}>
      <FindingsSearchBar
        dataView={dataView!}
        setQuery={(newQuery) => {
          setUrlQuery({ ...newQuery, pageIndex: 0 });
        }}
        loading={findingsGroupByNone.isFetching}
      />
      <EuiSpacer size="m" />
      {!error && (
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false} style={{ width: 188 }}>
            <FindingsGroupBySelector type="default" />
            <EuiSpacer size="m" />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      {error && <ErrorCallout error={error} />}
      {!error && (
        <>
          {findingsGroupByNone.isSuccess && !!findingsGroupByNone.data.page.length && (
            <FindingsDistributionBar
              {...{
                distributionOnClick: handleDistributionClick,
                type: i18n.translate('xpack.csp.findings.latestFindings.tableRowTypeLabel', {
                  defaultMessage: 'Findings',
                }),
                total: findingsGroupByNone.data.total,
                passed: findingsGroupByNone.data.count.passed,
                failed: findingsGroupByNone.data.count.failed,
                ...getFindingsPageSizeInfo({
                  pageIndex,
                  pageSize,
                  currentPageSize: slicedPage.length,
                }),
              }}
            />
          )}
          <EuiSpacer />
          <FindingsTable
            onResetFilters={onResetFilters}
            onCloseFlyout={onCloseFlyout}
            onPaginateFlyout={onPaginateFlyout}
            onOpenFlyout={onOpenFlyout}
            flyoutFindingIndex={flyoutFindingIndex}
            loading={findingsGroupByNone.isFetching}
            items={slicedPage}
            pagination={pagination}
            sorting={{
              sort: { field: sort.field, direction: sort.direction },
            }}
            setTableOptions={setTableOptions}
            onAddFilter={(field, value, negate) =>
              setUrlQuery({
                pageIndex: 0,
                filters: getFilters({
                  filters,
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
