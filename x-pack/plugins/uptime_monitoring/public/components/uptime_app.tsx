/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NormalizedCacheObject } from 'apollo-cache-inmemory';
import { ApolloClient } from 'apollo-client';
import React from 'react';
import { ApolloProvider } from 'react-apollo';
import { UptimeOverview } from './overview';

export interface UptimeMonitoringAppProps {
  client: ApolloClient<NormalizedCacheObject>;
}

export const UptimeMonitoringApp = (props: UptimeMonitoringAppProps) => (
  <div className="app-wrapper-panel">
    <ApolloProvider client={props.client}>
      <UptimeOverview />
    </ApolloProvider>
  </div>
);
