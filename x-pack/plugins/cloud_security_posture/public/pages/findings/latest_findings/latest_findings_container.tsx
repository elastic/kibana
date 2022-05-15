/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import type { DataView } from '@kbn/data-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import { FindingsTable } from './latest_findings_table';
import { FindingsSearchBar } from '../layout/findings_search_bar';
import * as TEST_SUBJECTS from '../test_subjects';
import { useUrlQuery } from '../../../common/hooks/use_url_query';
import { useLatestFindings } from './use_latest_findings';
import type { FindingsGroupByNoneQuery } from './use_latest_findings';
import type { FindingsBaseURLQuery } from '../types';
import { useFindingsCounter } from '../use_findings_count';
import { FindingsDistributionBar } from '../layout/findings_distribution_bar';
import { getBaseQuery, getPaginationQuery, getPaginationTableParams } from '../utils';
import { PageWrapper, PageTitle, PageTitleText } from '../layout/findings_layout';
import { FindingsGroupBySelector } from '../layout/findings_group_by_selector';
import { useCspBreadcrumbs } from '../../../common/navigation/use_csp_breadcrumbs';
import { findingsNavigation } from '../../../common/navigation/constants';

export const getDefaultQuery = (): FindingsBaseURLQuery & FindingsGroupByNoneQuery => ({
  query: { language: 'kuery', query: '' },
  filters: [],
  sort: { field: '@timestamp', direction: 'desc' },
  pageIndex: 0,
  pageSize: 10,
});

export const LatestFindingsContainer = ({ dataView }: { dataView: DataView }) => {
  useCspBreadcrumbs([findingsNavigation.findings_default]);
  const { urlQuery, setUrlQuery } = useUrlQuery(getDefaultQuery);

  const baseEsQuery = useMemo(
    () => getBaseQuery({ dataView, filters: urlQuery.filters, query: urlQuery.query }),
    [dataView, urlQuery.filters, urlQuery.query]
  );

  const findingsCount = useFindingsCounter(baseEsQuery);
  const findingsGroupByNone = useLatestFindings({
    ...baseEsQuery,
    ...getPaginationQuery({ pageIndex: urlQuery.pageIndex, pageSize: urlQuery.pageSize }),
    sort: urlQuery.sort,
  });

  return (
    <div data-test-subj={TEST_SUBJECTS.FINDINGS_CONTAINER}>
      <FindingsSearchBar
        dataView={dataView}
        setQuery={setUrlQuery}
        query={urlQuery.query}
        filters={urlQuery.filters}
        loading={findingsGroupByNone.isFetching}
      />
      <PageWrapper>
        <LatestFindingsPageTitle />
        <FindingsGroupBySelector type="default" />
        <FindingsDistributionBar
          total={findingsGroupByNone.data?.total || 0}
          passed={findingsCount.data?.passed || 0}
          failed={findingsCount.data?.failed || 0}
          pageStart={urlQuery.pageIndex + 1} // API index is 0, but UI is 1
          pageEnd={urlQuery.pageIndex + urlQuery.pageSize}
        />
        <EuiSpacer />
        <FindingsTable
          data={findingsGroupByNone.data}
          error={findingsGroupByNone.error}
          loading={findingsGroupByNone.isFetching}
          pagination={getPaginationTableParams({
            pageSize: urlQuery.pageSize,
            pageIndex: urlQuery.pageIndex,
            totalItemCount: findingsGroupByNone.data?.total || 0,
          })}
          sorting={{
            sort: { field: urlQuery.sort.field, direction: urlQuery.sort.direction },
          }}
          setTableOptions={({ page, sort }) =>
            setUrlQuery({ pageIndex: page.index, pageSize: page.size, sort })
          }
        />
      </PageWrapper>
    </div>
  );
};

const LatestFindingsPageTitle = () => (
  <PageTitle>
    <PageTitleText
      title={<FormattedMessage id="xpack.csp.findings.findingsTitle" defaultMessage="Findings" />}
    />
  </PageTitle>
);
