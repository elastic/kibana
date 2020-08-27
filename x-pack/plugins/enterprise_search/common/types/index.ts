/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IAccount as IAppSearchAccount } from './app_search';
import { IWorkplaceSearchInitialData } from './workplace_search';

export interface IInitialAppData {
  readOnlyMode?: boolean;
  ilmEnabled?: boolean;
  configuredLimits?: IConfiguredLimits;
  appSearch?: IAppSearchAccount;
  workplaceSearch?: IWorkplaceSearchInitialData;
}

export interface IConfiguredLimits {
  maxDocumentByteSize: number;
  maxEnginesPerMetaEngine: number;
}
