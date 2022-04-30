/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { i18n } from '@kbn/i18n';

import { EntSearchLogStream } from '../../../../../../shared/log_stream';
import { DataPanel } from '../../../../data_panel';
import { EngineLogic } from '../../../../engine';

export const RejectedCurationsHistoryPanel: React.FC = () => {
  const { engineName } = useValues(EngineLogic);

  const filters = [
    'event.kind: event',
    'event.dataset: search-relevance-suggestions',
    `appsearch.adaptive_relevance.engine: ${engineName}`,
    'event.action: curation_suggestion',
    'appsearch.adaptive_relevance.suggestion.new_status: rejected',
  ];

  return (
    <DataPanel
      iconType="tableDensityNormal"
      title={
        <h2>
          {i18n.translate(
            'xpack.enterpriseSearch.appSearch.engine.curations.rejectedCurationsHistoryPanel.tableTitle',
            {
              defaultMessage: 'Recently rejected suggestions',
            }
          )}
        </h2>
      }
      subtitle={i18n.translate(
        'xpack.enterpriseSearch.appSearch.engine.curations.rejectedCurationsHistoryPanel.tableDescription',
        {
          defaultMessage: 'View suggestions you’ve previously rejected.',
        }
      )}
      hasBorder
    >
      <EntSearchLogStream
        hoursAgo={720}
        query={filters.join(' and ')}
        columns={[
          {
            type: 'field',
            field: 'appsearch.adaptive_relevance.query',
            header: i18n.translate(
              'xpack.enterpriseSearch.appSearch.engine.curations.rejectedCurationsHistoryPanel.queryColumnHeader',
              { defaultMessage: 'Query' }
            ),
          },
          { type: 'timestamp' },
          { type: 'message' },
        ]}
      />
    </DataPanel>
  );
};
