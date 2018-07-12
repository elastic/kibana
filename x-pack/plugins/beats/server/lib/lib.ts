/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DatabaseAdapter } from './adapters/database/adapter_types';
import { BackendFrameworkAdapter } from './adapters/framework/adapter_types';
import { CMBeatsDomain } from './domains/beats';
import { CMTagsDomain } from './domains/tags';
import { CMTokensDomain } from './domains/tokens';

export interface CMDomainLibs {
  beats: CMBeatsDomain;
  tags: CMTagsDomain;
  tokens: CMTokensDomain;
}

export interface CMServerLibs extends CMDomainLibs {
  framework: BackendFrameworkAdapter;
  database: DatabaseAdapter;
}
