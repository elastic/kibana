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
import { CloudPosturePageTitle } from '../../../components/cloud_posture_page_title';
import type { FindingsBaseProps } from '../types';
import { FindingsTable } from './latest_findings_table';
import { FindingsSearchBar } from '../layout/findings_search_bar';
import * as TEST_SUBJECTS from '../test_subjects';
import { useLatestFindings } from './use_latest_findings';
import type { FindingsGroupByNoneQuery } from './use_latest_findings';
import type { FindingsBaseURLQuery } from '../types';
import { FindingsDistributionBar } from '../layout/findings_distribution_bar';
import {
  getFindingsPageSizeInfo,
  getFilters,
  getPaginationTableParams,
  useBaseEsQuery,
  usePersistedQuery,
} from '../utils/utils';
import { LimitedResultsBar, PageTitle, PageTitleText } from '../layout/findings_layout';
import { FindingsGroupBySelector } from '../layout/findings_group_by_selector';
import { useUrlQuery } from '../../../common/hooks/use_url_query';
import { usePageSlice } from '../../../common/hooks/use_page_slice';
import { usePageSize } from '../../../common/hooks/use_page_size';
import { ErrorCallout } from '../layout/error_callout';
import { useLimitProperties } from '../utils/get_limit_properties';
import { LOCAL_STORAGE_PAGE_SIZE_FINDINGS_KEY } from '../../../common/constants';
import { CspFinding } from '../../../../common/schemas/csp_finding';

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
  const findingsGroupByNone = useLatestFindings({
    query: baseEsQuery.query,
    sort: urlQuery.sort,
    enabled: !baseEsQuery.error,
  });

  const slicedPage = usePageSlice(findingsGroupByNone.data?.page, urlQuery.pageIndex, pageSize);

  const error = findingsGroupByNone.error || baseEsQuery.error;

  const { isLastLimitedPage, limitedTotalItemCount } = useLimitProperties({
    total: findingsGroupByNone.data?.total,
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

  const flyoutFindingIndex = urlQuery?.findingIndex;

  const pagination = getPaginationTableParams({
    pageSize,
    pageIndex: urlQuery.pageIndex,
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
      const pageIndex = Math.floor(nextFindingIndex / pageSize);

      setUrlQuery({
        pageIndex,
        findingIndex: newFindingIndex,
      });
    },
    [pageSize, setUrlQuery]
  );

  return (
    <div data-test-subj={TEST_SUBJECTS.LATEST_FINDINGS_CONTAINER}>
      <FindingsSearchBar
        dataView={dataView}
        setQuery={(query) => {
          setUrlQuery({ ...query, pageIndex: 0 });
        }}
        loading={findingsGroupByNone.isFetching}
      />
      <EuiFlexGroup>
        <EuiFlexItem>
          <LatestFindingsPageTitle />
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ width: 400 }}>
          {!error && <FindingsGroupBySelector type="default" />}
        </EuiFlexItem>
      </EuiFlexGroup>
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
                  pageIndex: urlQuery.pageIndex,
                  pageSize,
                  currentPageSize: slicedPage.length,
                }),
              }}
            />
          )}
          <EuiSpacer />
          <FindingsTable
            onCloseFlyout={onCloseFlyout}
            onPaginateFlyout={onPaginateFlyout}
            onOpenFlyout={onOpenFlyout}
            flyoutFindingIndex={flyoutFindingIndex}
            loading={findingsGroupByNone.isFetching}
            items={slicedPage}
            pagination={pagination}
            sorting={{
              sort: { field: urlQuery.sort.field, direction: urlQuery.sort.direction },
            }}
            setTableOptions={({ page, sort }) => {
              setPageSize(page.size);
              setUrlQuery({
                sort,
                pageIndex: page.index,
              });
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

const LatestFindingsPageTitle = () => (
  <PageTitle>
    <PageTitleText
      title={
        <CloudPosturePageTitle
          title={i18n.translate('xpack.csp.findings.latestFindings.latestFindingsPageTitle', {
            defaultMessage: 'Findings',
          })}
        />
      }
    />
  </PageTitle>
);
