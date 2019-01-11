/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NormalizedCacheObject } from 'apollo-cache-inmemory';
import ApolloClient from 'apollo-client';
import React from 'react';
import { UMBreadcrumb } from '../breadcrumbs';
import { UptimePersistedState } from '../uptime_app';
import { CreateGraphQLClient } from './adapters/framework/framework_adapter_types';

export interface UMFrontendLibs {
  framework: UMFrameworkAdapter;
}

export type UMUpdateBreadcrumbs = (breadcrumbs: UMBreadcrumb[]) => void;

export interface UptimeAppProps {
  isUsingK7Design: boolean;
  updateBreadcrumbs: UMUpdateBreadcrumbs;
  kibanaBreadcrumbs: UMBreadcrumb[];
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
  render(createComponent: BootstrapUptimeApp, createGraphQLClient: CreateGraphQLClient): void;
}
