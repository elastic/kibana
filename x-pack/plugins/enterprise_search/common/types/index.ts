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
  access?: ProductAccess;
  appSearch?: AppSearchAccount;
  configuredLimits?: ConfiguredLimits;
  enterpriseSearchVersion?: string;
  features?: ProductFeatures;
  kibanaVersion?: string;
  readOnlyMode?: boolean;
  searchOAuth?: SearchOAuth;
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

export interface ProductFeatures {
  hasConnectors: boolean;
  hasDefaultIngestPipeline: boolean;
  hasDocumentLevelSecurityEnabled: boolean;
  hasIncrementalSyncEnabled: boolean;
  hasNativeConnectors: boolean;
  hasWebCrawler: boolean;
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

export interface ClientConfigType {
  canDeployEntSearch: boolean;
  host?: string;
  ui: {
    enabled: boolean;
  };
}

export type { ConnectorStats } from './connector_stats';
export type { ElasticsearchIndexWithPrivileges } from './indices';
export type { KibanaDeps } from './kibana_deps';
