/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DatabaseAdapter } from './adapters/database';
import { BackendFrameworkAdapter } from './adapters/framework';
import { HBPingsDomain } from './domains';

export interface HBDomainLibs {
  pings: HBPingsDomain;
}

export interface HBServerLibs extends HBDomainLibs {
  framework: BackendFrameworkAdapter;
  database?: DatabaseAdapter;
}
