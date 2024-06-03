/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiPageTemplate } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';

import { useTableData } from './use_table_data';

import { useAllInferenceEndpointsState } from './use_all_inference_endpoints_state';

import { InferenceEndpointsProvider } from '../../providers/inference_endpoints_provider';
import { EndpointsTable } from './endpoints_table';
import { TABLE_COLUMNS } from './table_columns';

interface TabularPageProps {
  addEndpointLabel: string;
  inferenceEndpoints: InferenceAPIConfigResponse[];
  setIsInferenceFlyoutVisible: (value: boolean) => void;
}

export const TabularPage: React.FC<TabularPageProps> = ({
  addEndpointLabel,
  setIsInferenceFlyoutVisible,
  inferenceEndpoints,
}) => {
  const { queryParams, setQueryParams } = useAllInferenceEndpointsState();

  const { paginatedSortedTableData, pagination, sorting } = useTableData(
    inferenceEndpoints,
    queryParams
  );

  const handleTableChange = useCallback(
    ({ page, sort }) => {
      const newQueryParams = {
        ...queryParams,
        ...(sort && {
          sortField: sort.field,
          sortOrder: sort.direction,
        }),
        ...(page && {
          page: page.index + 1,
          perPage: page.size,
        }),
      };
      setQueryParams(newQueryParams);
    },
    [queryParams, setQueryParams]
  );

  return (
    <InferenceEndpointsProvider>
      <EuiPageTemplate offset={0} restrictWidth={false} grow={false}>
        <EuiPageTemplate.Header
          css={{ '.euiPageHeaderContent > .euiFlexGroup': { flexWrap: 'wrap' } }}
          data-test-subj="allInferenceEndpointsPage"
          pageTitle={i18n.translate(
            'xpack.searchInferenceEndpoints.inferenceEndpoints.allInferenceEndpoints.title',
            {
              defaultMessage: 'Inference endpoints',
            }
          )}
          description={i18n.translate(
            'xpack.searchInferenceEndpoints.inferenceEndpoints.allInferenceEndpoints.description',
            {
              defaultMessage:
                'Manage your Elastic and third-party endpoints generated from the Inference API.',
            }
          )}
          rightSideItems={[
            <EuiFlexGroup gutterSize="xs">
              <EuiFlexItem>
                <EuiButton
                  key="newInferenceEndpoint"
                  color="primary"
                  iconType="plusInCircle"
                  data-test-subj="addEndpointButtonForAllInferenceEndpoints"
                  fill
                  onClick={() => setIsInferenceFlyoutVisible(true)}
                >
                  {addEndpointLabel}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>,
          ]}
        />
        <EndpointsTable
          columns={TABLE_COLUMNS}
          data={paginatedSortedTableData}
          onChange={handleTableChange}
          pagination={pagination}
          sorting={sorting}
        />
      </EuiPageTemplate>
    </InferenceEndpointsProvider>
  );
};
