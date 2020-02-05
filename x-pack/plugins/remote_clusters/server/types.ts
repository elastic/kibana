/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter, ElasticsearchServiceSetup, IClusterClient } from 'kibana/server';
import { LicensingPluginSetup } from '../../licensing/server';

export interface Dependencies {
  licensing: LicensingPluginSetup;
}

export interface RouteDependencies {
  router: IRouter;
  getLicenseStatus: () => LicenseStatus;
  elasticsearchService: ElasticsearchServiceSetup;
  elasticsearch: IClusterClient;
}

export interface LicenseStatus {
  valid: boolean;
  message?: string;
}
