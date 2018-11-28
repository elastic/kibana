/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DatabaseAdapter } from './adapters/database';
import { UMBackendFrameworkAdapter } from './adapters/framework';
import { UMPingsDomain } from './domains';
import { UMAuthDomain } from './domains/auth';

export interface UMDomainLibs {
  pings: UMPingsDomain;
  auth: UMAuthDomain;
}

export interface UMServerLibs extends UMDomainLibs {
  framework: UMBackendFrameworkAdapter;
  database?: DatabaseAdapter;
}
