/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { EntSearchLogStream } from '../../../../shared/log_stream';
import { DataPanel } from '../../data_panel';

interface Props {
  query: string;
  engineName: string;
}

export const History: React.FC<Props> = ({ query, engineName }) => {
  return (
    <DataPanel
      iconType="tableDensityNormal"
      title={
        <h2>
          {i18n.translate(
            'xpack.enterpriseSearch.appSearch.engine.curation.detail.historyTableTitle',
            {
              defaultMessage: 'Automated curation changes',
            }
          )}
        </h2>
      }
      subtitle={i18n.translate(
        'xpack.enterpriseSearch.appSearch.engine.curation.detail.historyTableDescription',
        {
          defaultMessage: 'A detailed log of recent changes to your automated curation.',
        }
      )}
      hasBorder
    >
      <EntSearchLogStream
        hoursAgo={720}
        query={`appsearch.search_relevance_suggestions.query: ${query} and event.kind: event and event.dataset: search-relevance-suggestions and appsearch.search_relevance_suggestions.engine : ${engineName}`}
        columns={[
          { type: 'timestamp' },
          {
            type: 'field',
            field: 'appsearch.search_relevance_suggestions.query',
            header: 'Query',
          },
          {
            type: 'field',
            field: 'event.type',
            header: 'Event type',
          },
          {
            type: 'field',
            field: 'appsearch.search_relevance_suggestions.suggestion.new_status',
            header: 'Status',
          },
          {
            type: 'field',
            field: 'appsearch.search_relevance_suggestions.suggestion.curation.promoted_docs',
            header: 'Promoted documents',
          },
        ]}
      />
    </DataPanel>
  );
};
