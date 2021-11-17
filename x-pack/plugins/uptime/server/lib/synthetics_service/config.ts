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
  /* This should be a separate process. We need to have a UI toggle to turn on an off the ability
   * to use the service (since there is billing involved). Generating the api key should happen on this action */
  // const apiKey: SyntheticsServiceApiKey = await axios.get(API_URLS.API_KEYS);
  // if (apiKey) {
  //   await axios.post(API_URLS.SYNC_CONFIG);
  // }

  const apiKey = await savedObjectsAdapter.getSyntheticsServiceApiKey(savedObjectsClient!);
  const settings = await savedObjectsAdapter.getUptimeDynamicSettings(savedObjectsClient);

  if (apiKey) await pushConfigs({ core, config, cloud, apiKey, settings });
}
