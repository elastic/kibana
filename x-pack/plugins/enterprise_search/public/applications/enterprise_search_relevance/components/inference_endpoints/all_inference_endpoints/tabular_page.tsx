/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {} from './constants';

import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';

import {
  InferenceEndpointUI,
  INFERENCE_ENDPOINTS_TABLE_PER_PAGE_VALUES,
  SortFieldInferenceEndpoint,
  SortOrder,
} from '../../../../../../common/ui/types';
import { EnterpriseSearchRelevancePageTemplate } from '../../layout/page_template';

import { InferenceEndpointsTable } from './inference_endpoints_table';
import { TABLE_COLUMNS } from './table_columns';
import { useAllInferenceEndpointsState } from './use_all_inference_endpoints_state';

interface TabularPageProps {
  addEndpointLabel: string;
  breadcrumbs: string[];
  inferenceEndpoints: InferenceAPIConfigResponse[];
  setIsInferenceFlyoutVisible: (value: boolean) => void;
}

const getSortField = (field: string): SortFieldInferenceEndpoint => {
  if (field in SortFieldInferenceEndpoint) {
    return SortFieldInferenceEndpoint[field as keyof typeof SortFieldInferenceEndpoint];
  }
  return SortFieldInferenceEndpoint.endpoint;
};

export const TabularPage: React.FC<TabularPageProps> = ({
  addEndpointLabel,
  breadcrumbs,
  setIsInferenceFlyoutVisible,
  inferenceEndpoints,
}) => {
  const { queryParams, setQueryParams } = useAllInferenceEndpointsState();

  const sorting = useMemo(
    () => ({
      sort: {
        direction: queryParams.sortOrder,
        field: queryParams.sortField,
      },
    }),
    [queryParams.sortField, queryParams.sortOrder]
  );

  const pagination = useMemo(
    () => ({
      pageIndex: queryParams.page - 1,
      pageSize: queryParams.perPage,
      pageSizeOptions: INFERENCE_ENDPOINTS_TABLE_PER_PAGE_VALUES,
      totalItemCount: inferenceEndpoints.length ?? 0,
    }),
    [inferenceEndpoints, queryParams]
  );

  const tableOnChangeCallback = useCallback(
    ({ page, sort }) => {
      let newQueryParams = queryParams;
      if (sort) {
        newQueryParams = {
          ...newQueryParams,
          sortField: getSortField(sort.field),
          sortOrder: sort.direction,
        };
      }
      if (page) {
        newQueryParams = {
          ...newQueryParams,
          page: page.index + 1,
          perPage: page.size,
        };
      }
      setQueryParams(newQueryParams);
    },
    [queryParams, setQueryParams]
  );

  const tableData: InferenceEndpointUI[] = useMemo(() => {
    return inferenceEndpoints.map((endpoint) => ({
      endpoint: endpoint.model_id,
      provider: endpoint.service,
      type: endpoint.task_type,
    }));
  }, [inferenceEndpoints]);

  const sortedTableData: InferenceEndpointUI[] = useMemo(() => {
    return [...tableData].sort((a, b) => {
      const aValue = a[queryParams.sortField];
      const bValue = b[queryParams.sortField];

      if (aValue < bValue) {
        return queryParams.sortOrder === SortOrder.desc ? 1 : -1;
      }
      if (aValue > bValue) {
        return queryParams.sortOrder === SortOrder.asc ? -1 : 1;
      }
      return 0;
    });
  }, [tableData, queryParams]);

  const paginatedSortedTableData: InferenceEndpointUI[] = useMemo(() => {
    const startIndex = pagination.pageIndex * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    return sortedTableData.slice(startIndex, endIndex);
  }, [sortedTableData, pagination]);

  return (
    <EnterpriseSearchRelevancePageTemplate
      pageChrome={breadcrumbs}
      pageViewTelemetry="Inference Endpoints"
      isLoading={false}
      pageHeader={{
        description: i18n.translate(
          'xpack.enterpriseSearch.relevance.inferenceEndpoints.description',
          {
            defaultMessage:
              'Manage your Elastic and third-party endpoints generated from the Inference API.',
          }
        ),
        pageTitle: i18n.translate('xpack.enterpriseSearch.inferenceEndpoints.title', {
          defaultMessage: 'Inference endpoints',
        }),
        rightSideGroupProps: {
          gutterSize: 's',
          responsive: false,
        },
        rightSideItems: [
          <EuiFlexGroup gutterSize="xs">
            <EuiFlexItem>
              <EuiButton
                data-test-subj="entSearchRelevance-inferenceEndpoints-addButton"
                key="newInferenceEndpoint"
                color="primary"
                iconType="plusInCircle"
                fill
                onClick={() => setIsInferenceFlyoutVisible(true)}
              >
                {addEndpointLabel}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>,
        ],
      }}
    >
      <InferenceEndpointsTable
        columns={TABLE_COLUMNS}
        data={paginatedSortedTableData}
        onChange={tableOnChangeCallback}
        pagination={pagination}
        sorting={sorting}
      />
    </EnterpriseSearchRelevancePageTemplate>
  );
};
