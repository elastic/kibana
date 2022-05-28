/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Account as AppSearchAccount,
  ConfiguredLimits as AppSearchConfiguredLimits,
} from './app_search';
import {
  WorkplaceSearchInitialData,
  ConfiguredLimits as WorkplaceSearchConfiguredLimits,
} from './workplace_search';

export interface InitialAppData {
  enterpriseSearchVersion?: string;
  kibanaVersion?: string;
  readOnlyMode?: boolean;
  searchOAuth?: SearchOAuth;
  configuredLimits?: ConfiguredLimits;
  access?: ProductAccess;
  appSearch?: AppSearchAccount;
  workplaceSearch?: WorkplaceSearchInitialData;
}

export interface ConfiguredLimits {
  appSearch: AppSearchConfiguredLimits;
  workplaceSearch: WorkplaceSearchConfiguredLimits;
}

export interface ProductAccess {
  hasAppSearchAccess: boolean;
  hasWorkplaceSearchAccess: boolean;
}

export interface SearchOAuth {
  clientId: string;
  redirectUrl: string;
}

export interface MetaPage {
  current: number;
  size: number;
  total_pages: number;
  total_results: number;
}

export interface Meta {
  page: MetaPage;
}

export type { ElasticsearchIndex } from './indices';
