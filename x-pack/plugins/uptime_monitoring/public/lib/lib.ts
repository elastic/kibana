/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NormalizedCacheObject } from 'apollo-cache-inmemory';
import ApolloClient from 'apollo-client';
import React from 'react';
import { Breadcrumb } from 'ui/chrome';
import { UptimePersistedState } from '../uptime_monitoring_app';

export interface UMFrontendLibs {
  framework: UMFrameworkAdapter;
}

export type UMUpdateBreadcrumbs = (breadcrumbs: Breadcrumb[]) => void;

export interface UptimeAppProps {
  isUsingK7Design: boolean;
  updateBreadcrumbs: UMUpdateBreadcrumbs;
  kibanaBreadcrumbs: Breadcrumb[];
  routerBasename: string;
  graphQLClient: ApolloClient<NormalizedCacheObject>;
  initialDateRangeStart?: number;
  initialDateRangeEnd?: number;
  initialAutorefreshInterval?: number;
  initialAutorefreshEnabled?: boolean;
  persistState(state: UptimePersistedState): void;
}

export type BootstrapUptimeApp = (props: UptimeAppProps) => React.ReactElement<any>;

export interface UMFrameworkAdapter {
  render(component: BootstrapUptimeApp, graphQLClient: ApolloClient<NormalizedCacheObject>): void;
}
