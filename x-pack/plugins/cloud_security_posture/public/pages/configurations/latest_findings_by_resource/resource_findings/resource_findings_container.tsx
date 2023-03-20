/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import {
  EuiSpacer,
  EuiButtonEmpty,
  EuiPageHeader,
  type EuiDescriptionListProps,
} from '@elastic/eui';
import { Link, useParams } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n-react';
import { generatePath } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { CspInlineDescriptionList } from '../../../../components/csp_inline_description_list';
import type { Evaluation } from '../../../../../common/types';
import { CspFinding } from '../../../../../common/schemas/csp_finding';
import { CloudPosturePageTitle } from '../../../../components/cloud_posture_page_title';
import * as TEST_SUBJECTS from '../../test_subjects';
import { LimitedResultsBar, PageTitle, PageTitleText } from '../../layout/findings_layout';
import { findingsNavigation } from '../../../../common/navigation/constants';
import { ResourceFindingsQuery, useResourceFindings } from './use_resource_findings';
import { useUrlQuery } from '../../../../common/hooks/use_url_query';
import { usePageSlice } from '../../../../common/hooks/use_page_slice';
import { usePageSize } from '../../../../common/hooks/use_page_size';
import type { FindingsBaseURLQuery, FindingsBaseProps } from '../../types';
import {
  getFindingsPageSizeInfo,
  getFilters,
  getPaginationTableParams,
  useBaseEsQuery,
  usePersistedQuery,
} from '../../utils/utils';
import { ResourceFindingsTable } from './resource_findings_table';
import { FindingsSearchBar } from '../../layout/findings_search_bar';
import { ErrorCallout } from '../../layout/error_callout';
import { FindingsDistributionBar } from '../../layout/findings_distribution_bar';
import { LOCAL_STORAGE_PAGE_SIZE_FINDINGS_KEY } from '../../../../common/constants';
import { useLimitProperties } from '../../utils/get_limit_properties';

const getDefaultQuery = ({
  query,
  filters,
}: FindingsBaseURLQuery): FindingsBaseURLQuery &
  ResourceFindingsQuery & { findingIndex: number } => ({
  query,
  filters,
  sort: { field: 'result.evaluation' as keyof CspFinding, direction: 'asc' },
  pageIndex: 0,
  findingIndex: -1,
});

const BackToResourcesButton = () => (
  <Link to={generatePath(findingsNavigation.findings_by_resource.path)}>
    <EuiButtonEmpty iconType={'arrowLeft'}>
      <FormattedMessage
        id="xpack.csp.findings.resourceFindings.backToResourcesPageButtonLabel"
        defaultMessage="Back to resources"
      />
    </EuiButtonEmpty>
  </Link>
);

const getResourceFindingSharedValues = (sharedValues: {
  resourceId: string;
  resourceSubType: string;
  resourceName: string;
  clusterId: string;
  cloudAccountName: string;
}): EuiDescriptionListProps['listItems'] => [
  {
    title: i18n.translate('xpack.csp.findings.resourceFindingsSharedValues.resourceTypeTitle', {
      defaultMessage: 'Resource Type',
    }),
    description: sharedValues.resourceSubType,
  },
  {
    title: i18n.translate('xpack.csp.findings.resourceFindingsSharedValues.resourceIdTitle', {
      defaultMessage: 'Resource ID',
    }),
    description: sharedValues.resourceId,
  },
  {
    title: i18n.translate('xpack.csp.findings.resourceFindingsSharedValues.clusterIdTitle', {
      defaultMessage: 'Cluster ID',
    }),
    description: sharedValues.clusterId,
  },
  {
    title: i18n.translate('xpack.csp.findings.resourceFindingsSharedValues.cloudAccountName', {
      defaultMessage: 'Cloud Account Name',
    }),
    description: sharedValues.cloudAccountName,
  },
];

export const ResourceFindings = ({ dataView }: FindingsBaseProps) => {
  const params = useParams<{ resourceId: string }>();
  const decodedResourceId = decodeURIComponent(params.resourceId);

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
  const resourceFindings = useResourceFindings({
    sort: urlQuery.sort,
    query: baseEsQuery.query,
    resourceId: decodedResourceId,
    enabled: !baseEsQuery.error,
  });

  const error = resourceFindings.error || baseEsQuery.error;

  const slicedPage = usePageSlice(resourceFindings.data?.page, urlQuery.pageIndex, pageSize);

  const { isLastLimitedPage, limitedTotalItemCount } = useLimitProperties({
    total: resourceFindings.data?.total,
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
    <div data-test-subj={TEST_SUBJECTS.RESOURCES_FINDINGS_CONTAINER}>
      <FindingsSearchBar
        dataView={dataView}
        setQuery={(query) => {
          setUrlQuery({ ...query, pageIndex: 0 });
        }}
        loading={resourceFindings.isFetching}
      />
      <PageTitle>
        <BackToResourcesButton />
        <PageTitleText
          title={
            <CloudPosturePageTitle
              title={i18n.translate(
                'xpack.csp.findings.resourceFindings.resourceFindingsPageTitle',
                {
                  defaultMessage: '{resourceName} {hyphen} Findings',
                  values: {
                    resourceName: resourceFindings.data?.resourceName,
                    hyphen: resourceFindings.data?.resourceName ? '-' : '',
                  },
                }
              )}
            />
          }
        />
      </PageTitle>
      <EuiPageHeader
        description={
          resourceFindings.data && (
            <CspInlineDescriptionList
              listItems={getResourceFindingSharedValues({
                resourceId: decodedResourceId,
                resourceName: resourceFindings.data?.resourceName || '',
                resourceSubType: resourceFindings.data?.resourceSubType || '',
                clusterId: resourceFindings.data?.clusterId || '',
                cloudAccountName: resourceFindings.data?.cloudAccountName || '',
              })}
            />
          )
        }
      />
      <EuiSpacer />
      {error && <ErrorCallout error={error} />}
      {!error && (
        <>
          {resourceFindings.isSuccess && !!resourceFindings.data.page.length && (
            <FindingsDistributionBar
              {...{
                distributionOnClick: handleDistributionClick,
                type: i18n.translate('xpack.csp.findings.resourceFindings.tableRowTypeLabel', {
                  defaultMessage: 'Findings',
                }),
                total: resourceFindings.data.total,
                passed: resourceFindings.data.count.passed,
                failed: resourceFindings.data.count.failed,
                ...getFindingsPageSizeInfo({
                  pageIndex: urlQuery.pageIndex,
                  pageSize,
                  currentPageSize: slicedPage.length,
                }),
              }}
            />
          )}
          <EuiSpacer />
          <ResourceFindingsTable
            onCloseFlyout={onCloseFlyout}
            onPaginateFlyout={onPaginateFlyout}
            onOpenFlyout={onOpenFlyout}
            flyoutFindingIndex={flyoutFindingIndex}
            loading={resourceFindings.isFetching}
            items={slicedPage}
            pagination={pagination}
            sorting={{
              sort: { field: urlQuery.sort.field, direction: urlQuery.sort.direction },
            }}
            setTableOptions={({ page, sort }) => {
              setPageSize(page.size);
              setUrlQuery({ pageIndex: page.index, sort });
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
