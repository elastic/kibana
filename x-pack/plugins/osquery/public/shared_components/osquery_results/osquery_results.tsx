/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import { KibanaContextProvider, useKibana } from '../../common/lib/kibana';
import { EmptyPrompt } from '../../routes/components/empty_prompt';

import { queryClient } from '../../query_client';
import { KibanaRenderContextProvider } from '../../shared_imports';
import type { StartPlugins } from '../../types';
import { OsqueryResult } from './osquery_result';
import type { OsqueryActionResultsProps } from './types';

const OsqueryActionResultsComponent: React.FC<OsqueryActionResultsProps> = ({
  ruleName,
  actionItems,
  ecsData,
}) => {
  const { read } = useKibana().services.application.capabilities.osquery;

  return !read ? (
    <EmptyPrompt />
  ) : (
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
  <KibanaRenderContextProvider {...services}>
    <KibanaContextProvider services={services}>
      <QueryClientProvider client={queryClient}>
        <OsqueryActionResults {...restProps} />
      </QueryClientProvider>
    </KibanaContextProvider>
  </KibanaRenderContextProvider>
);

const OsqueryActionResultsWrapper = React.memo(OsqueryActionResultsWrapperComponent);

// eslint-disable-next-line import/no-default-export
export { OsqueryActionResultsWrapper as default };
