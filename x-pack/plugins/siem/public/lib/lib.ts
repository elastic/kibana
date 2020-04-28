/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IScope } from 'angular';
import { NormalizedCacheObject } from 'apollo-cache-inmemory';
import ApolloClient from 'apollo-client';

export interface AppFrontendLibs {
  apolloClient: AppApolloClient;
}

export type AppTimezoneProvider = () => string;

export type AppApolloClient = ApolloClient<NormalizedCacheObject>;

export interface AppFrameworkAdapter {
  appState?: object;
  bytesFormat?: string;
  dateFormat?: string;
  dateFormatTz?: string;
  darkMode?: boolean;
  indexPattern?: string;
  anomalyScore?: number;
  scaledDateFormat?: string;
  timezone?: string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setUISettings(key: string, value: any): void;
}

export interface AppKibanaUIConfig {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get(key: string): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set(key: string, value: any): Promise<boolean>;
}

export interface AppKibanaAdapterServiceRefs {
  config: AppKibanaUIConfig;
  rootScope: IScope;
}

export type AppBufferedKibanaServiceCall<ServiceRefs> = (serviceRefs: ServiceRefs) => void;
