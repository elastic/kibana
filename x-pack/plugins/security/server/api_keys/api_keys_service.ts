/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IClusterClient, Logger } from '@kbn/core/server';
import type { KibanaFeature } from '@kbn/features-plugin/server';
import type { SecurityLicense } from '@kbn/security-plugin-types-common';

import { APIKeys } from '../authentication/api_keys';

/**
 * Represents the options to create an APIKey class instance that will be
 * shared between functions (create, invalidate, etc).
 */
export interface SetupOptions {
  getClusterClient: () => Promise<IClusterClient>;
  getKibanaFeatures: () => Promise<KibanaFeature[]>;
  license: SecurityLicense;
  applicationName: string;
}

export class APIKeysService {
  private logger: Logger;

  constructor(_logger: Logger) {
    this.logger = _logger.get('ecs');
  }

  setup({ getClusterClient, license, applicationName, getKibanaFeatures }: SetupOptions) {
    const apiKeysService = new APIKeys({
      getClusterClient,
      logger: this.logger.get('api-key'),
      license,
      applicationName,
      getKibanaFeatures,
    });
    return apiKeysService;
  }
  stop() {}
}
