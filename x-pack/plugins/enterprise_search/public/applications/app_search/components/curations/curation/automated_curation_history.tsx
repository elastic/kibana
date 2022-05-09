/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { EntSearchLogStream } from '../../../../shared/log_stream';
import { DataPanel } from '../../data_panel';

interface Props {
  query: string;
  engineName: string;
}

export const AutomatedCurationHistory: React.FC<Props> = ({ query, engineName }) => {
  const [endTimestamp, setEndTimestamp] = useState(Date.now());
  const filters = [
    `appsearch.adaptive_relevance.query: ${query}`,
    'event.kind: event',
    'event.dataset: search-relevance-suggestions',
    `appsearch.adaptive_relevance.engine: ${engineName}`,
    'event.action: curation_suggestion',
    'appsearch.adaptive_relevance.suggestion.new_status: automated',
  ];

  return (
    <DataPanel
      iconType="tableDensityNormal"
      title={
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem component="h2">
            {i18n.translate(
              'xpack.enterpriseSearch.appSearch.engine.curation.detail.historyTableTitle',
              { defaultMessage: 'Adaptive relevance changes' }
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="refresh"
              size="xs"
              onClick={() => setEndTimestamp(Date.now())}
            >
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.engines.apiLogs.newEventsButtonLabel',
                {
                  defaultMessage: 'Refresh',
                }
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      subtitle={i18n.translate(
        'xpack.enterpriseSearch.appSearch.engine.curation.detail.historyTableDescription',
        {
          defaultMessage:
            'A detailed log of recent changes to curations powered by adaptive relevance.',
        }
      )}
      hasBorder
    >
      <EntSearchLogStream
        hoursAgo={720}
        endTimestamp={endTimestamp}
        query={filters.join(' and ')}
        columns={[{ type: 'timestamp' }, { type: 'message' }]}
      />
    </DataPanel>
  );
};
