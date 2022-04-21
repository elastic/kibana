/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClient } from '@kbn/core/server';
import { ApmIndicesConfig } from '@kbn/observability-plugin/common/typings';
import {
  APM_INDEX_SETTINGS_SAVED_OBJECT_TYPE,
  APM_INDEX_SETTINGS_SAVED_OBJECT_ID,
} from '../../../../common/apm_saved_object_constants';
import { APMConfig } from '../../..';
import { APMRouteHandlerResources } from '../../typings';
import { withApmSpan } from '../../../utils/with_apm_span';
import { APMIndices } from '../../../saved_objects/apm_indices';

export type { ApmIndicesConfig };

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

export function getApmIndicesConfig(config: APMConfig): ApmIndicesConfig {
  return {
    sourcemap: config.indices.sourcemap,
    error: config.indices.error,
    onboarding: config.indices.onboarding,
    span: config.indices.span,
    transaction: config.indices.transaction,
    metric: config.indices.metric,
    // system indices, not configurable
    apmAgentConfigurationIndex: '.apm-agent-configuration',
    apmCustomLinkIndex: '.apm-custom-link',
  };
}

export async function getApmIndices({
  config,
  savedObjectsClient,
}: {
  config: APMConfig;
  savedObjectsClient: ISavedObjectsClient;
}): Promise<ApmIndicesConfig> {
  try {
    const apmIndicesSavedObject = await getApmIndicesSavedObject(
      savedObjectsClient
    );
    const apmIndicesConfig = getApmIndicesConfig(config);
    return { ...apmIndicesConfig, ...apmIndicesSavedObject };
  } catch (error) {
    return getApmIndicesConfig(config);
  }
}

export async function getApmIndexSettings({
  context,
  config,
}: Pick<APMRouteHandlerResources, 'context' | 'config'>) {
  let apmIndicesSavedObject: Awaited<
    ReturnType<typeof getApmIndicesSavedObject>
  >;
  try {
    apmIndicesSavedObject = await getApmIndicesSavedObject(
      context.core.savedObjects.client
    );
  } catch (error: any) {
    if (error.output && error.output.statusCode === 404) {
      apmIndicesSavedObject = {};
    } else {
      throw error;
    }
  }
  const apmIndicesConfig = getApmIndicesConfig(config);

  const apmIndices = Object.keys(config.indices) as Array<
    keyof typeof config.indices
  >;

  return apmIndices.map((configurationName) => ({
    configurationName,
    defaultValue: apmIndicesConfig[configurationName], // value defined in kibana[.dev].yml
    savedValue: apmIndicesSavedObject?.[configurationName], // value saved via Saved Objects service
  }));
}
