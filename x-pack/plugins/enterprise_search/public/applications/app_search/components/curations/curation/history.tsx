/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { LogStream } from '../../../../../../../infra/public';
import { EntSearchLogStream } from '../../../../shared/log_stream';

interface Props {
  query: string;
}

export const History: React.FC<Props> = ({ query }) => {
  return (
    <div>
      <EntSearchLogStream
        hoursAgo={720}
        query={`appsearch.search_relevance_suggestions.query: ${query} and event.kind: event and event.dataset: search-relevance-suggestions`}
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
    </div>
  );
};
