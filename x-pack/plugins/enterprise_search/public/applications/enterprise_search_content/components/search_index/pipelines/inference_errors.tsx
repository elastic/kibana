/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import { EuiBasicTable, EuiBasicTableColumn, EuiSpacer, EuiLoadingSpinner } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { MlInferenceError } from '../../../../../../common/types/pipelines';
import { DataPanel } from '../../../../shared/data_panel/data_panel';

import { FetchMlInferenceErrorsApiLogic } from '../../../api/pipelines/fetch_ml_inference_pipeline_errors';

import { InferenceErrorsLogic } from './inference_errors_logic';

export const InferenceErrors: React.FC = () => {
  const { indexName, isLoading, inferenceErrors } = useValues(InferenceErrorsLogic);
  const { makeRequest } = useActions(FetchMlInferenceErrorsApiLogic);

  useEffect(() => {
    makeRequest({ indexName });
  }, [indexName]);

  const errorsColumns: Array<EuiBasicTableColumn<MlInferenceError>> = [
    {
      dataType: 'date',
      field: 'timestamp',
      name: i18n.translate(
        'xpack.enterpriseSearch.content.indices.pipelines.tabs.pipelineInferenceLogs.tableColumn.timestamp',
        { defaultMessage: 'Timestamp' }
      ),
    },
    {
      dataType: 'string',
      field: 'message',
      name: i18n.translate(
        'xpack.enterpriseSearch.content.indices.pipelines.tabs.pipelineInferenceLogs.tableColumn.message',
        { defaultMessage: 'Error message' }
      ),
      textOnly: true,
    },
    {
      dataType: 'number',
      field: 'doc_count',
      name: i18n.translate(
        'xpack.enterpriseSearch.content.indices.pipelines.tabs.pipelineInferenceLogs.tableColumn.docCount',
        { defaultMessage: 'Approx. document count' }
      ),
    },
  ];

  return (
    <>
      <EuiSpacer />
      <DataPanel
        hasBorder
        iconType="documents"
        title={
          <h2>
            {i18n.translate(
              'xpack.enterpriseSearch.content.indices.pipelines.tabs.pipelineInferenceLogs.title',
              { defaultMessage: 'Inference errors' }
            )}
          </h2>
        }
      >
        {isLoading ? (
          <EuiLoadingSpinner />
        ) : (
          <EuiBasicTable
            tableLayout="auto"
            columns={errorsColumns}
            items={inferenceErrors}
            rowHeader="message"
            noItemsMessage={i18n.translate(
              'xpack.enterpriseSearch.content.indices.pipelines.tabs.pipelineInferenceLogs.emptyMessage',
              { defaultMessage: 'This index has no inference errors' }
            )}
          />
        )}
      </DataPanel>
    </>
  );
};
