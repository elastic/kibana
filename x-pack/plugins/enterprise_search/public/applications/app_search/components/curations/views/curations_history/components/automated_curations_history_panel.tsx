/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { useValues } from 'kea';

import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { ENTERPRISE_SEARCH_RELEVANCE_LOGS_SOURCE_ID } from '../../../../../../../../common/constants';
import { EntSearchLogStream } from '../../../../../../shared/log_stream';
import { DataPanel } from '../../../../data_panel';
import { EngineLogic } from '../../../../engine';

export const AutomatedCurationsHistoryPanel: React.FC = () => {
  const { engineName } = useValues(EngineLogic);
  const [endTimestamp, setEndTimestamp] = useState(Date.now());

  const filters = [
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
        <EuiFlexGroup>
          <EuiFlexItem component="h2">
            {i18n.translate(
              'xpack.enterpriseSearch.appSearch.engine.curations.automatedCurationsHistoryPanel.tableTitle',
              {
                defaultMessage: 'Adaptive relevance changes',
              }
            )}
          </EuiFlexItem>
          <EuiFlexItem component="span" grow={false}>
            <EuiButtonEmpty
              iconType="refresh"
              size="xs"
              onClick={() => setEndTimestamp(Date.now())}
            >
              {i18n.translate('xpack.enterpriseSearch.appSearch.engines.curations.refreshButton', {
                defaultMessage: 'Refresh',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      subtitle={i18n.translate(
        'xpack.enterpriseSearch.appSearch.engine.curations.automatedCurationsHistoryPanel.tableDecription',
        {
          defaultMessage:
            'A detailed log of recent changes to curations powered by adaptive relevance.',
        }
      )}
      hasBorder
    >
      <EntSearchLogStream
        sourceId={ENTERPRISE_SEARCH_RELEVANCE_LOGS_SOURCE_ID}
        hoursAgo={720}
        query={filters.join(' and ')}
        endTimestamp={endTimestamp}
        columns={[
          {
            type: 'field',
            field: 'appsearch.adaptive_relevance.query',
            header: i18n.translate(
              'xpack.enterpriseSearch.appSearch.engine.curations.automatedCurationsHistoryPanel.queryColumnHeader',
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
