/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getApmIndicesSavedObject } from '@kbn/apm-data-access-plugin/server/saved_objects/apm_indices';
import { APMRouteHandlerResources } from '../../apm_routes/register_apm_server_routes';

export type ApmIndexSettingsResponse = Array<{
  configurationName: 'transaction' | 'span' | 'error' | 'metric' | 'onboarding';
  defaultValue: string; // value defined in kibana[.dev].yml
  savedValue: string | undefined;
}>;

export async function getApmIndexSettings(
  resources: APMRouteHandlerResources
): Promise<ApmIndexSettingsResponse> {
  let apmIndicesSavedObject: Awaited<
    ReturnType<typeof getApmIndicesSavedObject>
  >;

  const { apmIndicesFromConfigFile } = resources.plugins.apmDataAccess.setup;

  try {
    const soClient = (await resources.context.core).savedObjects.client;
    apmIndicesSavedObject = await getApmIndicesSavedObject(soClient);
  } catch (error: any) {
    if (error.output && error.output.statusCode === 404) {
      apmIndicesSavedObject = {};
    } else {
      throw error;
    }
  }

  const apmIndicesKeys = Object.keys(apmIndicesFromConfigFile) as Array<
    keyof typeof apmIndicesFromConfigFile
  >;

  return apmIndicesKeys.map((configurationName) => ({
    configurationName,
    defaultValue: apmIndicesFromConfigFile[configurationName], // value defined in kibana[.dev].yml
    savedValue: apmIndicesSavedObject?.[configurationName], // value saved via Saved Objects service
  }));
}
