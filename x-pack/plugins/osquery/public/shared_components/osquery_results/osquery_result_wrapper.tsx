/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComment } from '@elastic/eui';
import React, { useState, useEffect } from 'react';
import { FormattedRelative } from '@kbn/i18n-react';

import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { QueryClientProvider } from '@tanstack/react-query';
import { EmptyPrompt } from '../../routes/components/empty_prompt';
import { useKibana } from '../../common/lib/kibana';
import type { StartPlugins } from '../../types';
import { queryClient } from '../../query_client';
import { AlertAttachmentContext } from '../../common/contexts';
import { PackQueriesStatusTable } from '../../live_queries/form/pack_queries_status_table';
import { ATTACHED_QUERY } from '../../agents/translations';
import { useLiveQueryDetails } from '../../actions/use_live_query_details';
import type { OsqueryActionResultProps } from './types';

// eslint-disable-next-line react/display-name
const OsqueryResultComponent = React.memo<OsqueryActionResultProps>(
  ({ actionId, ruleName, startDate, ecsData }) => {
    const { read } = useKibana().services.application.capabilities.osquery;

    const [isLive, setIsLive] = useState(false);
    const { data } = useLiveQueryDetails({
      actionId,
      isLive,
      skip: !read,
    });

    useEffect(() => {
      setIsLive(() => !(data?.status === 'completed'));
    }, [data?.status]);

    return (
      <AlertAttachmentContext.Provider value={ecsData}>
        <EuiComment
          username={ruleName}
          timestamp={<FormattedRelative value={startDate} />}
          event={ATTACHED_QUERY}
          data-test-subj={'osquery-results-comment'}
        >
          {!read ? (
            <EmptyPrompt />
          ) : (
            <PackQueriesStatusTable
              actionId={actionId}
              data={data?.queries}
              startDate={data?.['@timestamp']}
              expirationDate={data?.expiration}
              agentIds={data?.agents}
            />
          )}
        </EuiComment>
      </AlertAttachmentContext.Provider>
    );
  }
);

export const OsqueryActionResult = React.memo(OsqueryResultComponent);
type OsqueryActionResultsWrapperProps = {
  services: CoreStart & StartPlugins;
} & OsqueryActionResultProps;

const OsqueryActionResultWrapperComponent: React.FC<OsqueryActionResultsWrapperProps> = ({
  services,
  ...restProps
}) => (
  <KibanaRenderContextProvider {...services}>
    <KibanaContextProvider services={services}>
      <QueryClientProvider client={queryClient}>
        <OsqueryActionResult {...restProps} />
      </QueryClientProvider>
    </KibanaContextProvider>
  </KibanaRenderContextProvider>
);

const OsqueryActionResultWrapper = React.memo(OsqueryActionResultWrapperComponent);

// eslint-disable-next-line import/no-default-export
export { OsqueryActionResultWrapper as default };
