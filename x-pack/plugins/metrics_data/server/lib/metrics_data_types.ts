/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { IBasePath } from '@kbn/core/server';
import { KibanaFramework } from './adapters/framework/kibana_framework_adapter';
import { InfraFieldsDomain } from './domains/fields_domain';
import { InfraSources } from './sources';
import { InfraSourceStatus } from './source_status';

export interface MetricsDataDomainLibs {
  fields: InfraFieldsDomain;
}

export interface MetricsDataBackendLibs extends MetricsDataDomainLibs {
  basePath: IBasePath;
  framework: KibanaFramework;
  sources: InfraSources;
  sourceStatus: InfraSourceStatus;
  logger: Logger;
}
