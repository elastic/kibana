/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiLink,
  EuiSpacer,
  EuiLoadingSpinner,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { MlInferenceHistoryItem } from '../../../../../../common/types/pipelines';
import { DataPanel } from '../../../../shared/data_panel/data_panel';

import { InferenceHistoryLogic } from './inference_history_logic';

export const InferenceHistory: React.FC = () => {
  const { indexName, isLoading, inferenceHistory } = useValues(InferenceHistoryLogic);
  const { fetchIndexInferenceHistory } = useActions(InferenceHistoryLogic);

  useEffect(() => {
    fetchIndexInferenceHistory({ indexName });
  }, [indexName]);

  const historyColumns: Array<EuiBasicTableColumn<MlInferenceHistoryItem>> = [
    {
      dataType: 'string',
      field: 'pipeline',
      name: i18n.translate(
        'xpack.enterpriseSearch.content.indices.pipelines.tabs.inferenceHistory.tableColumn.pipeline',
        { defaultMessage: 'Inference pipeline' }
      ),
    },
    {
      dataType: 'number',
      field: 'doc_count',
      name: i18n.translate(
        'xpack.enterpriseSearch.content.indices.pipelines.tabs.inferenceHistory.tableColumn.docCount',
        { defaultMessage: 'Approx. document count' }
      ),
    },
  ];
  return (
    <>
      <EuiSpacer />
      <DataPanel
        hasBorder
        iconType="compute"
        title={
          <h2>
            {i18n.translate(
              'xpack.enterpriseSearch.content.indices.pipelines.tabs.inferenceHistory.title',
              { defaultMessage: 'Historical inference processors' }
            )}
          </h2>
        }
        subtitle={i18n.translate(
          'xpack.enterpriseSearch.content.indices.pipelines.tabs.inferenceHistory.subtitle',
          {
            defaultMessage:
              'The following inference processors were found in the _ingest.processors field of documents on this index.',
          }
        )}
        footerDocLink={
          // TODO: insert real doc link
          <EuiLink href="#" target="_blank" color="subdued">
            {i18n.translate(
              'xpack.enterpriseSearch.content.indices.pipelines.tabs.inferenceHistory.docLink',
              {
                defaultMessage: 'Learn more about inference history',
              }
            )}
          </EuiLink>
        }
      >
        {isLoading ? (
          <EuiLoadingSpinner />
        ) : (
          <EuiBasicTable
            columns={historyColumns}
            items={inferenceHistory ?? []}
            rowHeader="pipeline"
          />
        )}
      </DataPanel>
    </>
  );
};
