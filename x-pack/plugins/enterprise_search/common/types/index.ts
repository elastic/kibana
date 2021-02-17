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
  readOnlyMode?: boolean;
  ilmEnabled?: boolean;
  isFederatedAuth?: boolean;
  configuredLimits?: ConfiguredLimits;
  access?: {
    hasAppSearchAccess: boolean;
    hasWorkplaceSearchAccess: boolean;
  };
  appSearch?: AppSearchAccount;
  workplaceSearch?: WorkplaceSearchInitialData;
}

export interface ConfiguredLimits {
  appSearch: AppSearchConfiguredLimits;
  workplaceSearch: WorkplaceSearchConfiguredLimits;
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
