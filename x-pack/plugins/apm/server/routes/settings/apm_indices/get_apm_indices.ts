/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClient } from '@kbn/core/server';
import type { APMDataAccessConfig } from '@kbn/apm-data-access-plugin/server';
import {
  APM_INDEX_SETTINGS_SAVED_OBJECT_TYPE,
  APM_INDEX_SETTINGS_SAVED_OBJECT_ID,
} from '../../../../common/apm_saved_object_constants';
import { APMRouteHandlerResources } from '../../typings';
import { withApmSpan } from '../../../utils/with_apm_span';
import { APMIndices } from '../../../saved_objects/apm_indices';

export type ApmIndicesConfig = Readonly<{
  error: string;
  onboarding: string;
  span: string;
  transaction: string;
  metric: string;
}>;

export const APM_AGENT_CONFIGURATION_INDEX = '.apm-agent-configuration';
export const APM_CUSTOM_LINK_INDEX = '.apm-custom-link';
export const APM_SOURCE_MAP_INDEX = '.apm-source-map';

type ISavedObjectsClient = Pick<SavedObjectsClient, 'get'>;

async function getApmIndicesSavedObject(
  savedObjectsClient: ISavedObjectsClient
) {
  const apmIndicesSavedObject = await withApmSpan(
    'get_apm_indices_saved_object',
    () =>
      savedObjectsClient.get<Partial<APMIndices>>(
        APM_INDEX_SETTINGS_SAVED_OBJECT_TYPE,
        APM_INDEX_SETTINGS_SAVED_OBJECT_ID
      )
  );
  return apmIndicesSavedObject.attributes.apmIndices;
}

export async function getApmIndices({
  apmIndicesConfig,
  savedObjectsClient,
}: {
  apmIndicesConfig: APMDataAccessConfig['indices'];
  savedObjectsClient: ISavedObjectsClient;
}): Promise<ApmIndicesConfig> {
  try {
    const apmIndicesSavedObject = await getApmIndicesSavedObject(
      savedObjectsClient
    );
    return { ...apmIndicesConfig, ...apmIndicesSavedObject };
  } catch (error) {
    return apmIndicesConfig;
  }
}

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

  const { apmIndicesConfig } = resources;

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

  const apmIndices = Object.keys(apmIndicesConfig) as Array<
    keyof typeof apmIndicesConfig
  >;

  return apmIndices.map((configurationName) => ({
    configurationName,
    defaultValue: apmIndicesConfig[configurationName], // value defined in kibana[.dev].yml
    savedValue: apmIndicesSavedObject?.[configurationName], // value saved via Saved Objects service
  }));
}
