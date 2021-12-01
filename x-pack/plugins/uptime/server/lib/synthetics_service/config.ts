/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { CoreStart, ISavedObjectsRepository } from 'kibana/server';
import { pushConfigs } from './push_configs';
import { UptimeConfig } from '../../config';
import { CloudSetup } from '../../../../cloud/server';
import { savedObjectsAdapter } from '../saved_objects';

export async function syncSyntheticsConfig({
  core,
  config,
  cloud,
  savedObjectsClient,
}: {
  core: CoreStart;
  config: UptimeConfig;
  cloud?: CloudSetup;
  savedObjectsClient: ISavedObjectsRepository;
}) {
  const apiKey = await savedObjectsAdapter.getSyntheticsServiceApiKey(savedObjectsClient!);
  const settings = await savedObjectsAdapter.getUptimeDynamicSettings(savedObjectsClient);

  if (apiKey) await pushConfigs({ core, config, cloud, apiKey, settings });
}
