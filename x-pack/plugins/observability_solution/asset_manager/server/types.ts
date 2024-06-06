/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  ApmDataAccessPluginSetup,
  ApmDataAccessPluginStart,
} from '@kbn/apm-data-access-plugin/server';
import { MetricsDataPluginSetup } from '@kbn/metrics-data-access-plugin/server';
import { SecurityPluginStart } from '@kbn/security-plugin/server';
import {
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '@kbn/encrypted-saved-objects-plugin/server';
import { SpacesPluginSetup } from '@kbn/spaces-plugin/server';
import { AssetClient } from './lib/asset_client';
import { AssetManagerConfig } from '../common/config';

export interface AssetManagerServerSetup {
  core: CoreStart;
  config: AssetManagerConfig;
  logger: Logger;
  assetClient: AssetClient;
  security: SecurityPluginStart;
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  isServerless: boolean;
}

export interface ElasticsearchAccessorOptions {
  elasticsearchClient: ElasticsearchClient;
}

export interface AssetManagerPluginSetupDependencies {
  apmDataAccess: ApmDataAccessPluginSetup;
  metricsDataAccess: MetricsDataPluginSetup;
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
  spaces?: SpacesPluginSetup;
}
export interface AssetManagerPluginStartDependencies {
  apmDataAccess: ApmDataAccessPluginStart;
  security: SecurityPluginStart;
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
}
