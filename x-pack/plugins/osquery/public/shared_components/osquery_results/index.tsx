/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiErrorBoundary, EuiSpacer } from '@elastic/eui';
import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import type { CoreStart } from '@kbn/core/public';

import { KibanaContextProvider } from '../../common/lib/kibana';

import { queryClient } from '../../query_client';
import { KibanaThemeProvider } from '../../shared_imports';
import type { StartPlugins } from '../../types';
import type { OsqueryActionResultsProps } from './types';
import { OsqueryResult } from './osquery_result';

const OsqueryActionResultsComponent: React.FC<OsqueryActionResultsProps> = ({
  agentIds,
  ruleName,
  actionItems,
  ecsData,
}) => (
  <div data-test-subj={'osquery-results'}>
    {actionItems?.map((item) => {
      const actionId = item.fields?.action_id?.[0];
      const queryId = item.fields?.['queries.action_id']?.[0];
      const startDate = item.fields?.['@timestamp'][0];

      return (
        <OsqueryResult
          key={actionId}
          actionId={actionId}
          queryId={queryId}
          startDate={startDate}
          ruleName={ruleName}
          agentIds={agentIds}
          ecsData={ecsData}
        />
      );
    })}
    <EuiSpacer size="s" />
  </div>
);

export const OsqueryActionResults = React.memo(OsqueryActionResultsComponent);

type OsqueryActionResultsWrapperProps = {
  services: CoreStart & StartPlugins;
} & OsqueryActionResultsProps;

const OsqueryActionResultsWrapperComponent: React.FC<OsqueryActionResultsWrapperProps> = ({
  services,
  ...restProps
}) => (
  <KibanaThemeProvider theme$={services.theme.theme$}>
    <KibanaContextProvider services={services}>
      <EuiErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <OsqueryActionResults {...restProps} />
        </QueryClientProvider>
      </EuiErrorBoundary>
    </KibanaContextProvider>
  </KibanaThemeProvider>
);

const OsqueryActionResultsWrapper = React.memo(OsqueryActionResultsWrapperComponent);

// eslint-disable-next-line import/no-default-export
export { OsqueryActionResultsWrapper as default };
