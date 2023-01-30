/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiErrorBoundary } from '@elastic/eui';
import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import type { CoreStart } from '@kbn/core/public';

import { KibanaContextProvider } from '../../common/lib/kibana';

import { OsqueryResults } from './osquery_results';
import { OsqueryResultsWithQuery } from './osquery_results_with_query';
import { queryClient } from '../../query_client';
import { KibanaThemeProvider } from '../../shared_imports';
import type { StartPlugins } from '../../types';
import type { OsqueryActionResultsProps } from './types';

const OsqueryActionResultsComponent: React.FC<OsqueryActionResultsProps> = ({
  agentIds,
  ruleName,
  actionItems,
  alertId,
  actionId,
  ecsData,
}) => {
  if (actionItems) {
    return (
      <OsqueryResults
        agentIds={agentIds}
        ruleName={ruleName}
        actionItems={actionItems}
        ecsData={ecsData}
      />
    );
  }

  return (
    <OsqueryResultsWithQuery
      agentIds={agentIds}
      ruleName={ruleName}
      actionId={actionId}
      alertId={alertId}
      ecsData={ecsData}
    />
  );
};

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
