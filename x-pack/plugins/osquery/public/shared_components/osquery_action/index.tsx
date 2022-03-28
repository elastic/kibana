/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiErrorBoundary, EuiLoadingContent, EuiEmptyPrompt, EuiCode } from '@elastic/eui';
import React, { useMemo } from 'react';
import { QueryClientProvider } from 'react-query';
import { i18n } from '@kbn/i18n';
import { KibanaContextProvider, useKibana } from '../../common/lib/kibana';

import { LiveQuery } from '../../live_queries';
import { queryClient } from '../../query_client';
import { OsqueryIcon } from '../../components/osquery_icon';
import { KibanaThemeProvider } from '../../shared_imports';
import { useIsOsqueryAvailable } from './use_is_osquery_available';

interface OsqueryActionProps {
  agentId?: string;
  formType: 'steps' | 'simple';
  addToTimeline: (actionId: string) => void;
}

const OsqueryActionComponent: React.FC<OsqueryActionProps> = ({
  agentId,
  formType = 'simple',
  addToTimeline,
}) => {
  const permissions = useKibana().services.application.capabilities.osquery;

  const emptyPrompt = useMemo(
    () => (
      <EuiEmptyPrompt
        icon={<OsqueryIcon />}
        title={
          <h2>
            {i18n.translate('xpack.osquery.action.shortEmptyTitle', {
              defaultMessage: 'Osquery is not available',
            })}
          </h2>
        }
        titleSize="xs"
        body={
          <p>
            {i18n.translate('xpack.osquery.action.empty', {
              defaultMessage:
                'An Elastic Agent is not installed on this host. To run queries, install Elastic Agent on the host, and then add the Osquery Manager integration to the agent policy in Fleet.',
            })}
          </p>
        }
      />
    ),
    []
  );
  const { osqueryAvailable, agentFetched, isLoading, policyFetched, policyLoading, agentData } =
    useIsOsqueryAvailable(agentId);

  if (!agentId || (agentFetched && !agentData)) {
    return emptyPrompt;
  }

  if (!(permissions.runSavedQueries || permissions.writeLiveQueries)) {
    return (
      <EuiEmptyPrompt
        icon={<OsqueryIcon />}
        title={
          <h2>
            {i18n.translate('xpack.osquery.action.permissionDenied', {
              defaultMessage: 'Permission denied',
            })}
          </h2>
        }
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
        title={
          <h2>
            {i18n.translate('xpack.osquery.action.shortEmptyTitle', {
              defaultMessage: 'Osquery is not available',
            })}
          </h2>
        }
        titleSize="xs"
        body={
          <p>
            {i18n.translate('xpack.osquery.action.unavailable', {
              defaultMessage:
                'The Osquery Manager integration is not added to the agent policy. To run queries on the host, add the Osquery Manager integration to the agent policy in Fleet.',
            })}
          </p>
        }
      />
    );
  }

  if (agentData?.status !== 'online') {
    return (
      <EuiEmptyPrompt
        icon={<OsqueryIcon />}
        title={
          <h2>
            {i18n.translate('xpack.osquery.action.shortEmptyTitle', {
              defaultMessage: 'Osquery is not available',
            })}
          </h2>
        }
        titleSize="xs"
        body={
          <p>
            {i18n.translate('xpack.osquery.action.agentStatus', {
              defaultMessage:
                'To run queries on this host, the Elastic Agent must be active. Check the status of this agent in Fleet.',
            })}
          </p>
        }
      />
    );
  }

  return <LiveQuery formType={formType} agentId={agentId} addToTimeline={addToTimeline} />;
};

const OsqueryAction = React.memo(OsqueryActionComponent);

// @ts-expect-error update types
const OsqueryActionWrapperComponent = ({ services, agentId, formType, addToTimeline }) => (
  <KibanaThemeProvider theme$={services.theme.theme$}>
    <KibanaContextProvider services={services}>
      <EuiErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <OsqueryAction agentId={agentId} formType={formType} addToTimeline={addToTimeline} />
        </QueryClientProvider>
      </EuiErrorBoundary>
    </KibanaContextProvider>
  </KibanaThemeProvider>
);

const OsqueryActionWrapper = React.memo(OsqueryActionWrapperComponent);

// eslint-disable-next-line import/no-default-export
export { OsqueryActionWrapper as default };
