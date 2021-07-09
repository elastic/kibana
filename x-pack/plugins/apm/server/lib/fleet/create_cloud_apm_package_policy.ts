/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ElasticsearchClient,
  SavedObjectsClientContract,
  Logger,
} from 'kibana/server';
import {
  APM_SERVER_SCHEMA_SAVED_OBJECT_TYPE,
  APM_SERVER_SCHEMA_SAVED_OBJECT_ID,
} from '../../../common/apm_saved_object_constants';
import {
  APMPluginSetupDependencies,
  APMPluginStartDependencies,
} from '../../types';
import { getApmPackagePolicyDefinition } from './get_apm_package_policy_definition';

export async function createCloudApmPackgePolicy({
  cloudPluginSetup,
  fleetPluginStart,
  savedObjectsClient,
  esClient,
  logger,
}: {
  cloudPluginSetup: APMPluginSetupDependencies['cloud'];
  fleetPluginStart: NonNullable<APMPluginStartDependencies['fleet']>;
  savedObjectsClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  logger: Logger;
}) {
  const { attributes } = await savedObjectsClient.get(
    APM_SERVER_SCHEMA_SAVED_OBJECT_TYPE,
    APM_SERVER_SCHEMA_SAVED_OBJECT_ID
  );
  const apmServerSchema: Record<string, any> = JSON.parse(
    (attributes as { schemaJson: string }).schemaJson
  );
  const apmPackagePolicyDefinition = getApmPackagePolicyDefinition({
    apmServerSchema,
    cloudPluginSetup,
  });
  logger.info(`Fleet migration on Cloud - apmPackagePolicy create start`);
  const apmPackagePolicy = await fleetPluginStart.packagePolicyService.create(
    savedObjectsClient,
    esClient,
    apmPackagePolicyDefinition,
    { force: true, bumpRevision: true }
  );
  logger.info(`Fleet migration on Cloud - apmPackagePolicy create end`);
  return apmPackagePolicy;
}
