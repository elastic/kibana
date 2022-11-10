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

import { useAllLiveQueries } from '../../actions/use_all_live_queries';
import { KibanaContextProvider } from '../../common/lib/kibana';
import { Direction } from '../../../common/search_strategy';

import { queryClient } from '../../query_client';
import { KibanaThemeProvider } from '../../shared_imports';
import type { StartPlugins } from '../../types';
import type { OsqueryActionResultsProps } from './types';
import { OsqueryResult } from './osquery_result';

const OsqueryActionResultsComponent: React.FC<OsqueryActionResultsProps> = ({
  agentIds,
  ruleName,
  alertId,
  ecsData,
}) => {
  const { data: actionsData } = useAllLiveQueries({
    filterQuery: { term: { alert_ids: alertId } },
    activePage: 0,
    limit: 100,
    direction: Direction.desc,
    sortField: '@timestamp',
  });

  return (
    <div data-test-subj={'osquery-results'}>
      {actionsData?.data.items.map((item, index) => {
        const actionId = item.fields?.action_id?.[0];
        const queryId = item.fields?.['queries.action_id']?.[0];
        // const query = item.fields?.['queries.query']?.[0];
        const startDate = item.fields?.['@timestamp'][0];

        return (
          <OsqueryResult
            key={actionId + index}
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
