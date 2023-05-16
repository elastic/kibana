/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCode, EuiComment, EuiEmptyPrompt, EuiErrorBoundary, EuiSpacer } from '@elastic/eui';
import React, { useLayoutEffect, useMemo, useState } from 'react';
import { FormattedRelative } from '@kbn/i18n-react';

import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { KibanaContextProvider, KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClientProvider } from '@tanstack/react-query';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '../../common/lib/kibana';
import { PERMISSION_DENIED } from '../osquery_action/translations';
import type { StartPlugins } from '../../types';
import { queryClient } from '../../query_client';
import { AlertAttachmentContext } from '../../common/contexts';
import { PackQueriesStatusTable } from '../../live_queries/form/pack_queries_status_table';
import { ATTACHED_QUERY } from '../../agents/translations';
import { useLiveQueryDetails } from '../../actions/use_live_query_details';
import type { OsqueryActionResultProps } from './types';

const OsqueryResultComponent = React.memo<OsqueryActionResultProps>(
  ({ actionId, ruleName, startDate, ecsData }) => {
    const { read } = useKibana().services.application.capabilities.osquery;

    const [isLive, setIsLive] = useState(false);
    const { data } = useLiveQueryDetails({
      actionId,
      isLive,
      skip: !read,
    });

    useLayoutEffect(() => {
      setIsLive(() => !(data?.status === 'completed'));
    }, [data?.status]);

    const emptyPrompt = useMemo(
      () => (
        <EuiEmptyPrompt
          iconType="logoOsquery"
          title={<h2>{PERMISSION_DENIED}</h2>}
          titleSize="xs"
          body={
            <FormattedMessage
              id="xpack.osquery.results.permissionDenied"
              defaultMessage="To access these results, ask your administrator for {osquery} Kibana
              privileges."
              // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
              values={{
                osquery: <EuiCode>osquery</EuiCode>,
              }}
            />
          }
        />
      ),
      []
    );

    return (
      <AlertAttachmentContext.Provider value={ecsData}>
        <EuiSpacer size="s" />
        <EuiComment
          username={ruleName && ruleName[0]}
          timestamp={<FormattedRelative value={startDate} />}
          event={ATTACHED_QUERY}
          data-test-subj={'osquery-results-comment'}
        >
          {!read ? (
            emptyPrompt
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
        <EuiSpacer size="s" />
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
  <KibanaThemeProvider theme$={services.theme.theme$}>
    <KibanaContextProvider services={services}>
      <EuiErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <OsqueryActionResult {...restProps} />
        </QueryClientProvider>
      </EuiErrorBoundary>
    </KibanaContextProvider>
  </KibanaThemeProvider>
);

const OsqueryActionResultWrapper = React.memo(OsqueryActionResultWrapperComponent);

// eslint-disable-next-line import/no-default-export
export { OsqueryActionResultWrapper as default };
