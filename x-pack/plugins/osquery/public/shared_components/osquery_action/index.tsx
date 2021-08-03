/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiErrorBoundary, EuiLoadingContent } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { QueryClientProvider } from 'react-query';
import { KibanaContextProvider, useKibana } from '../../common/lib/kibana';

import { LiveQueryForm } from '../../live_queries/form';
import { queryClient } from '../../query_client';

interface OsqueryActionProps {
  hostId?: string | undefined;
}

const OsqueryActionComponent: React.FC<OsqueryActionProps> = ({ hostId }) => {
  const [agentId, setAgentId] = useState<string>();
  const { indexPatterns, search } = useKibana().services.data;

  useEffect(() => {
    if (hostId) {
      const findAgent = async () => {
        const searchSource = await search.searchSource.create();
        const indexPattern = await indexPatterns.find('.fleet-agents');

        searchSource.setField('index', indexPattern[0]);
        searchSource.setField('filter', [
          {
            meta: {
              alias: null,
              disabled: false,
              negate: false,
              key: 'local_metadata.host.id',
              value: hostId,
            },
            query: {
              match_phrase: {
                'local_metadata.host.id': hostId,
              },
            },
          },
          {
            meta: {
              alias: null,
              disabled: false,
              negate: false,
              key: 'active',
              value: 'true',
            },
            query: {
              match_phrase: {
                active: 'true',
              },
            },
          },
        ]);

        const response = await searchSource.fetch$().toPromise();

        if (response.rawResponse.hits.hits.length && response.rawResponse.hits.hits[0]._id) {
          setAgentId(response.rawResponse.hits.hits[0]._id);
        }
      };

      findAgent();
    }
  });

  if (!agentId) {
    return <EuiLoadingContent lines={10} />;
  }

  return (
    // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
    <LiveQueryForm defaultValue={{ agentSelection: { agents: [agentId] } }} agentId={agentId} />
  );
};

export const OsqueryAction = React.memo(OsqueryActionComponent);

// @ts-expect-error update types
const OsqueryActionWrapperComponent = ({ services, ...props }) => (
  <KibanaContextProvider services={services}>
    <EuiErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <OsqueryAction {...props} />
      </QueryClientProvider>
    </EuiErrorBoundary>
  </KibanaContextProvider>
);

const OsqueryActionWrapper = React.memo(OsqueryActionWrapperComponent);

// eslint-disable-next-line import/no-default-export
export { OsqueryActionWrapper as default };
