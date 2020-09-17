/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IAccount as IAppSearchAccount } from './app_search';
import { IAccount as IWorkplaceSearchAccount, IOrganization } from './workplace_search';

export interface IInitialAppData {
  readOnlyMode?: boolean;
  ilmEnabled?: boolean;
  configuredLimits?: IConfiguredLimits;
  appSearch?: IAppSearchAccount;
  workplaceSearch?: {
    organization: IOrganization;
    fpAccount: IWorkplaceSearchAccount;
  };
}

export interface IConfiguredLimits {
  maxDocumentByteSize: number;
  maxEnginesPerMetaEngine: number;
}
