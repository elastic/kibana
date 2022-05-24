/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { DataView } from '@kbn/data-plugin/common';
import { Route, Switch } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n-react';
import { FindingsSearchBar } from '../layout/findings_search_bar';
import * as TEST_SUBJECTS from '../test_subjects';
import { useUrlQuery } from '../../../common/hooks/use_url_query';
import type { FindingsBaseURLQuery } from '../types';
import { FindingsByResourceQuery, useFindingsByResource } from './use_findings_by_resource';
import { FindingsByResourceTable } from './findings_by_resource_table';
import { getBaseQuery, getPaginationQuery, getPaginationTableParams } from '../utils';
import { PageTitle, PageTitleText, PageWrapper } from '../layout/findings_layout';
import { FindingsGroupBySelector } from '../layout/findings_group_by_selector';
import { findingsNavigation } from '../../../common/navigation/constants';
import { useCspBreadcrumbs } from '../../../common/navigation/use_csp_breadcrumbs';
import { ResourceFindings } from './resource_findings/resource_findings_container';

const getDefaultQuery = (): FindingsBaseURLQuery & FindingsByResourceQuery => ({
  query: { language: 'kuery', query: '' },
  filters: [],
  pageIndex: 0,
  pageSize: 10,
});

export const FindingsByResourceContainer = ({ dataView }: { dataView: DataView }) => (
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

const LatestFindingsByResource = ({ dataView }: { dataView: DataView }) => {
  useCspBreadcrumbs([findingsNavigation.findings_by_resource]);
  const { urlQuery, setUrlQuery } = useUrlQuery(getDefaultQuery);
  const findingsGroupByResource = useFindingsByResource({
    ...getBaseQuery({ dataView, filters: urlQuery.filters, query: urlQuery.query }),
    ...getPaginationQuery(urlQuery),
  });

  return (
    <div data-test-subj={TEST_SUBJECTS.FINDINGS_CONTAINER}>
      <FindingsSearchBar
        dataView={dataView}
        setQuery={setUrlQuery}
        query={urlQuery.query}
        filters={urlQuery.filters}
        loading={findingsGroupByResource.isLoading}
      />
      <PageWrapper>
        <PageTitle>
          <PageTitleText
            title={
              <FormattedMessage
                id="xpack.csp.findings.findingsByResourceTitle"
                defaultMessage="Findings"
              />
            }
          />
        </PageTitle>
        <FindingsGroupBySelector type="resource" />
        <FindingsByResourceTable
          data={findingsGroupByResource.data}
          error={findingsGroupByResource.error}
          loading={findingsGroupByResource.isLoading}
          pagination={getPaginationTableParams({
            pageSize: urlQuery.pageSize,
            pageIndex: urlQuery.pageIndex,
            totalItemCount: findingsGroupByResource.data?.total || 0,
          })}
          setTableOptions={({ page }) =>
            setUrlQuery({ pageIndex: page.index, pageSize: page.size })
          }
        />
      </PageWrapper>
    </div>
  );
};
