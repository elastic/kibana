/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiBottomBar, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import useLocalStorage from 'react-use/lib/useLocalStorage';
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
  getPaginationQuery,
  getPaginationTableParams,
  useBaseEsQuery,
  usePersistedQuery,
} from '../utils/utils';
import { PageTitle, PageTitleText } from '../layout/findings_layout';
import { FindingsGroupBySelector } from '../layout/findings_group_by_selector';
import { useUrlQuery } from '../../../common/hooks/use_url_query';
import { ErrorCallout } from '../layout/error_callout';
import { getLimitProperties } from '../utils/get_limit_properties';
import { LOCAL_STORAGE_PAGE_SIZE_LATEST_FINDINGS_KEY } from '../../../../common/constants';

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

const MAX_ITEMS = 500;

export const LatestFindingsContainer = ({ dataView }: FindingsBaseProps) => {
  const getPersistedDefaultQuery = usePersistedQuery(getDefaultQuery);
  const { urlQuery, setUrlQuery } = useUrlQuery(getPersistedDefaultQuery);
  const [pageSize, setPageSize] = useLocalStorage(
    LOCAL_STORAGE_PAGE_SIZE_LATEST_FINDINGS_KEY,
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
  const findingsGroupByNone = useLatestFindings({
    ...getPaginationQuery({
      pageIndex: urlQuery.pageIndex,
      pageSize: pageSize || urlQuery.pageSize,
    }),
    query: baseEsQuery.query,
    sort: urlQuery.sort,
    enabled: !baseEsQuery.error,
  });

  const error = findingsGroupByNone.error || baseEsQuery.error;

  const { isLastLimitedPage, limitedTotalItemCount } = useMemo(
    () =>
      getLimitProperties(
        findingsGroupByNone.data?.total || 0,
        MAX_ITEMS,
        urlQuery.pageSize,
        urlQuery.pageIndex
      ),
    [findingsGroupByNone.data?.total, urlQuery.pageIndex, urlQuery.pageSize]
  );

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
              pageSize: pageSize || urlQuery.pageSize,
              pageIndex: urlQuery.pageIndex,
              totalItemCount: limitedTotalItemCount,
            })}
            sorting={{
              sort: { field: urlQuery.sort.field, direction: urlQuery.sort.direction },
            }}
            setTableOptions={({ page, sort }) => {
              setPageSize(page.size);
              setUrlQuery({
                sort,
                pageIndex: page.index,
                pageSize: page.size,
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
          {isLastLimitedPage && (
            <>
              <EuiSpacer size="xxl" />
              <EuiBottomBar data-test-subj="test-bottom-bar">
                <EuiText textAlign="center">
                  <FormattedMessage
                    id="xpack.csp.findings.latestFindings.bottomBarLabel"
                    defaultMessage="These are the first {maxItems} findings matching your search, refine your search to see others."
                    values={{
                      maxItems: MAX_ITEMS,
                    }}
                  />
                </EuiText>
              </EuiBottomBar>
            </>
          )}
        </>
      )}
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
