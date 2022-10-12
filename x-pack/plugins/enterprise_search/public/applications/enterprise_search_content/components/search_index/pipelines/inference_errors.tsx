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

import { InferenceErrorsLogic } from './inference_errors_logic';

export const InferenceErrors: React.FC = () => {
  const { indexName, isLoading, inferenceErrors } = useValues(InferenceErrorsLogic);
  const { fetchIndexInferenceErrorLogs } = useActions(InferenceErrorsLogic);

  useEffect(() => {
    fetchIndexInferenceErrorLogs({ indexName });
  }, [indexName]);

  const errorsColumns: Array<EuiBasicTableColumn<MlInferenceError>> = [
    {
      dataType: 'date',
      field: 'timestamp',
      name: i18n.translate(
        'xpack.enterpriseSearch.content.indices.pipelines.tabs.pipelineLogs.tableColumn.timestamp',
        { defaultMessage: 'Timestamp' }
      ),
    },
    {
      dataType: 'string',
      field: 'message',
      name: i18n.translate(
        'xpack.enterpriseSearch.content.indices.pipelines.tabs.pipelineLogs.tableColumn.message',
        { defaultMessage: 'Inference error' }
      ),
      textOnly: true,
    },
    {
      dataType: 'number',
      field: 'doc_count',
      name: i18n.translate(
        'xpack.enterpriseSearch.content.indices.pipelines.tabs.pipelineLogs.tableColumn.docCount',
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
              'xpack.enterpriseSearch.content.indices.pipelines.tabs.pipelineLogs.title',
              { defaultMessage: 'Ingestion logs' }
            )}
          </h2>
        }
        subtitle={i18n.translate(
          'xpack.enterpriseSearch.content.indices.pipelines.tabs.pipelineLogs.subtitle',
          { defaultMessage: 'Errors and dropped data failures' }
        )}
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
              'xpack.enterpriseSearch.content.indices.pipelines.tabs.pipelineLogs.emptyMessage',
              { defaultMessage: 'This index has no inference errors' }
            )}
          />
        )}
      </DataPanel>
    </>
  );
};
