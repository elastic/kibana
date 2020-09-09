/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  IAccount as IAppSearchAccount,
  IConfiguredLimits as IAppSearchConfiguredLimits,
} from './app_search';
import {
  IWorkplaceSearchInitialData,
  IConfiguredLimits as IWorkplaceSearchConfiguredLimits,
} from './workplace_search';

export interface IInitialAppData {
  readOnlyMode?: boolean;
  ilmEnabled?: boolean;
  isFederatedAuth?: boolean;
  configuredLimits?: IConfiguredLimits;
  appSearch?: IAppSearchAccount;
  workplaceSearch?: IWorkplaceSearchInitialData;
}

export interface IConfiguredLimits {
  appSearch: IAppSearchConfiguredLimits;
  workplaceSearch: IWorkplaceSearchConfiguredLimits;
}

export interface IMetaPage {
  current: number;
  size: number;
  total_pages: number;
  total_results: number;
}

export interface IMeta {
  page: IMetaPage;
}

export interface IMetaPage {
  current: number;
  size: number;
  total_pages: number;
  total_results: number;
}

export interface IMeta {
  page: IMetaPage;
}
