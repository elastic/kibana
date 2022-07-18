/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiErrorBoundary, EuiLoadingContent, EuiEmptyPrompt, EuiCode } from '@elastic/eui';
import React, { useMemo } from 'react';
import { QueryClientProvider } from 'react-query';
import type { CoreStart } from '@kbn/core/public';
import {
  AGENT_STATUS_ERROR,
  EMPTY_PROMPT,
  NOT_AVAILABLE,
  PERMISSION_DENIED,
  SHORT_EMPTY_TITLE,
} from './translations';
import { KibanaContextProvider, useKibana } from '../../common/lib/kibana';

import { LiveQuery } from '../../live_queries';
import { queryClient } from '../../query_client';
import { OsqueryIcon } from '../../components/osquery_icon';
import { KibanaThemeProvider } from '../../shared_imports';
import { useIsOsqueryAvailable } from './use_is_osquery_available';
import type { StartPlugins } from '../../types';

interface OsqueryActionProps {
  agentId?: string;
  formType: 'steps' | 'simple';
  hideAgentsField?: boolean;
  addToTimeline?: (payload: { query: [string, string]; isIcon?: true }) => React.ReactElement;
}

const OsqueryActionComponent: React.FC<OsqueryActionProps> = ({
  agentId,
  formType = 'simple',
  hideAgentsField,
  addToTimeline,
}) => {
  const permissions = useKibana().services.application.capabilities.osquery;

  const emptyPrompt = useMemo(
    () => (
      <EuiEmptyPrompt
        icon={<OsqueryIcon />}
        title={<h2>{SHORT_EMPTY_TITLE}</h2>}
        titleSize="xs"
        body={<p>{EMPTY_PROMPT}</p>}
      />
    ),
    []
  );
  const { osqueryAvailable, agentFetched, isLoading, policyFetched, policyLoading, agentData } =
    useIsOsqueryAvailable(agentId);

  if (!agentId || (agentFetched && !agentData)) {
    return emptyPrompt;
  }

  if (
    (!permissions.runSavedQueries || !permissions.readSavedQueries) &&
    !permissions.writeLiveQueries
  ) {
    return (
      <EuiEmptyPrompt
        icon={<OsqueryIcon />}
        title={<h2>{PERMISSION_DENIED}</h2>}
        titleSize="xs"
        body={
          <p>
            To access this page, ask your administrator for <EuiCode>osquery</EuiCode> Kibana
            privileges.
          </p>
        }
      />
    );
  }

  if (isLoading) {
    return <EuiLoadingContent lines={10} />;
  }

  if (!policyFetched && policyLoading) {
    return <EuiLoadingContent lines={10} />;
  }

  if (!osqueryAvailable) {
    return (
      <EuiEmptyPrompt
        icon={<OsqueryIcon />}
        title={<h2>{SHORT_EMPTY_TITLE}</h2>}
        titleSize="xs"
        body={<p>{NOT_AVAILABLE}</p>}
      />
    );
  }

  if (agentData?.status !== 'online') {
    return (
      <EuiEmptyPrompt
        icon={<OsqueryIcon />}
        title={<h2>{SHORT_EMPTY_TITLE}</h2>}
        titleSize="xs"
        body={<p>{AGENT_STATUS_ERROR}</p>}
      />
    );
  }

  return (
    <LiveQuery
      formType={formType}
      agentId={agentId}
      hideAgentsField={hideAgentsField}
      addToTimeline={addToTimeline}
    />
  );
};

export const OsqueryAction = React.memo(OsqueryActionComponent);

type OsqueryActionWrapperProps = { services: CoreStart & StartPlugins } & OsqueryActionProps;

const OsqueryActionWrapperComponent: React.FC<OsqueryActionWrapperProps> = ({
  services,
  agentId,
  formType,
  hideAgentsField = false,
  addToTimeline,
}) => (
  <KibanaThemeProvider theme$={services.theme.theme$}>
    <KibanaContextProvider services={services}>
      <EuiErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <OsqueryAction
            agentId={agentId}
            formType={formType}
            hideAgentsField={hideAgentsField}
            addToTimeline={addToTimeline}
          />
        </QueryClientProvider>
      </EuiErrorBoundary>
    </KibanaContextProvider>
  </KibanaThemeProvider>
);

const OsqueryActionWrapper = React.memo(OsqueryActionWrapperComponent);

// eslint-disable-next-line import/no-default-export
export { OsqueryActionWrapper as default };
