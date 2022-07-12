/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiSpacer, EuiButtonEmpty } from '@elastic/eui';
import { Link, useParams } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n-react';
import { useEuiTheme } from '@elastic/eui';
import { generatePath } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import * as TEST_SUBJECTS from '../../test_subjects';
import { PageWrapper, PageTitle, PageTitleText } from '../../layout/findings_layout';
import { useCspBreadcrumbs } from '../../../../common/navigation/use_csp_breadcrumbs';
import { findingsNavigation } from '../../../../common/navigation/constants';
import { ResourceFindingsQuery, useResourceFindings } from './use_resource_findings';
import { useUrlQuery } from '../../../../common/hooks/use_url_query';
import type { FindingsBaseURLQuery, FindingsBaseProps, CspFinding } from '../../types';
import {
  getFindingsPageSizeInfo,
  addFilter,
  getPaginationQuery,
  getPaginationTableParams,
  useBaseEsQuery,
  usePersistedQuery,
} from '../../utils';
import { ResourceFindingsTable } from './resource_findings_table';
import { FindingsSearchBar } from '../../layout/findings_search_bar';
import { ErrorCallout } from '../../layout/error_callout';
import { FindingsDistributionBar } from '../../layout/findings_distribution_bar';

const getDefaultQuery = ({
  query,
  filters,
}: FindingsBaseURLQuery): FindingsBaseURLQuery & ResourceFindingsQuery => ({
  query,
  filters,
  sort: { field: 'result.evaluation' as keyof CspFinding, direction: 'asc' },
  pageIndex: 0,
  pageSize: 10,
});

const BackToResourcesButton = () => (
  <Link to={generatePath(findingsNavigation.findings_by_resource.path)}>
    <EuiButtonEmpty iconType={'arrowLeft'}>
      <FormattedMessage
        id="xpack.csp.findings.resourceFindings.backToResourcesPageButtonLabel"
        defaultMessage="Back to group by resource view"
      />
    </EuiButtonEmpty>
  </Link>
);

export const ResourceFindings = ({ dataView }: FindingsBaseProps) => {
  useCspBreadcrumbs([findingsNavigation.findings_default]);
  const { euiTheme } = useEuiTheme();
  const params = useParams<{ resourceId: string }>();

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
  const resourceFindings = useResourceFindings({
    ...getPaginationQuery({
      pageSize: urlQuery.pageSize,
      pageIndex: urlQuery.pageIndex,
    }),
    sort: urlQuery.sort,
    query: baseEsQuery.query,
    resourceId: params.resourceId,
    enabled: !baseEsQuery.error,
  });

  const error = resourceFindings.error || baseEsQuery.error;

  return (
    <div data-test-subj={TEST_SUBJECTS.FINDINGS_CONTAINER}>
      <FindingsSearchBar
        dataView={dataView}
        setQuery={(query) => {
          setUrlQuery({ ...query, pageIndex: 0 });
        }}
        loading={resourceFindings.isFetching}
      />
      <PageWrapper>
        <PageTitle>
          <BackToResourcesButton />
          <PageTitleText
            title={
              <div style={{ padding: euiTheme.size.s }}>
                <FormattedMessage
                  id="xpack.csp.findings.resourceFindings.resourceFindingsPageTitle"
                  defaultMessage="{resourceId} - Findings"
                  values={{ resourceId: params.resourceId }}
                />
              </div>
            }
          />
        </PageTitle>
        <EuiSpacer />
        {error && <ErrorCallout error={error} />}
        {!error && (
          <>
            {resourceFindings.isSuccess && !!resourceFindings.data.page.length && (
              <FindingsDistributionBar
                {...{
                  type: i18n.translate('xpack.csp.findings.resourceFindings.tableRowTypeLabel', {
                    defaultMessage: 'Findings',
                  }),
                  total: resourceFindings.data.total,
                  passed: resourceFindings.data.count.passed,
                  failed: resourceFindings.data.count.failed,
                  ...getFindingsPageSizeInfo({
                    pageIndex: urlQuery.pageIndex,
                    pageSize: urlQuery.pageSize,
                    currentPageSize: resourceFindings.data.page.length,
                  }),
                }}
              />
            )}
            <EuiSpacer />
            <ResourceFindingsTable
              loading={resourceFindings.isFetching}
              items={resourceFindings.data?.page || []}
              pagination={getPaginationTableParams({
                pageSize: urlQuery.pageSize,
                pageIndex: urlQuery.pageIndex,
                totalItemCount: resourceFindings.data?.total || 0,
              })}
              sorting={{
                sort: { field: urlQuery.sort.field, direction: urlQuery.sort.direction },
              }}
              setTableOptions={({ page, sort }) =>
                setUrlQuery({ pageIndex: page.index, pageSize: page.size, sort })
              }
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
