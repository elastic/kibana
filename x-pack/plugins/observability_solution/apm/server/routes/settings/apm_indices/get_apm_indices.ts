/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getApmIndicesSavedObject } from '@kbn/apm-data-access-plugin/server/saved_objects/apm_indices';
import { APMRouteHandlerResources } from '../../apm_routes/register_apm_server_routes';

export type ApmIndexSettingsResponse = Array<{
  configurationName: 'transaction' | 'span' | 'error' | 'metric' | 'onboarding' | 'sourcemap';
  defaultValue: string; // value defined in kibana[.dev].yml
  savedValue: string | undefined;
}>;

export async function getApmIndexSettings(
  resources: APMRouteHandlerResources
): Promise<ApmIndexSettingsResponse> {
  const { apmIndicesFromConfigFile } = resources.plugins.apmDataAccess.setup;

  const soClient = (await resources.context.core).savedObjects.client;
  const apmIndicesSavedObject = await getApmIndicesSavedObject(soClient);

  const apmIndicesKeys = Object.keys(apmIndicesFromConfigFile) as Array<
    keyof typeof apmIndicesFromConfigFile
  >;

  return apmIndicesKeys.map((configurationName) => ({
    configurationName,
    defaultValue: apmIndicesFromConfigFile[configurationName], // value defined in kibana[.dev].yml
    savedValue: apmIndicesSavedObject?.[configurationName], // value saved via Saved Objects service
  }));
}
