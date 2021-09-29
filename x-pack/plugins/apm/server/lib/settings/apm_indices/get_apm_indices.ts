/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClient } from 'src/core/server';
import { PromiseReturnType } from '../../../../../observability/typings/common';
import {
  APM_INDICES_SAVED_OBJECT_TYPE,
  APM_INDICES_SAVED_OBJECT_ID,
} from '../../../../common/apm_saved_object_constants';
import { APMConfig } from '../../..';
import { APMRouteHandlerResources } from '../../../routes/typings';
import { withApmSpan } from '../../../utils/with_apm_span';
import { ApmIndicesConfig } from '../../../../../observability/common/typings';

export { ApmIndicesConfig };

type ISavedObjectsClient = Pick<SavedObjectsClient, 'get'>;

export type ApmIndicesName = keyof ApmIndicesConfig;

async function getApmIndicesSavedObject(
  savedObjectsClient: ISavedObjectsClient
) {
  const apmIndices = await withApmSpan('get_apm_indices_saved_object', () =>
    savedObjectsClient.get<Partial<ApmIndicesConfig>>(
      APM_INDICES_SAVED_OBJECT_TYPE,
      APM_INDICES_SAVED_OBJECT_ID
    )
  );
  return apmIndices.attributes;
}

export function getApmIndicesConfig(config: APMConfig): ApmIndicesConfig {
  return {
    /* eslint-disable @typescript-eslint/naming-convention */
    'xpack.apm.sourcemapIndices': config['xpack.apm.sourcemapIndices'],
    'xpack.apm.errorIndices': config['xpack.apm.errorIndices'],
    'xpack.apm.onboardingIndices': config['xpack.apm.onboardingIndices'],
    'xpack.apm.spanIndices': config['xpack.apm.spanIndices'],
    'xpack.apm.transactionIndices': config['xpack.apm.transactionIndices'],
    'xpack.apm.metricsIndices': config['xpack.apm.metricsIndices'],
    'apm_oss.sourcemapIndices': config['apm_oss.sourcemapIndices'],
    'apm_oss.errorIndices': config['apm_oss.errorIndices'],
    'apm_oss.onboardingIndices': config['apm_oss.onboardingIndices'],
    'apm_oss.spanIndices': config['apm_oss.spanIndices'],
    'apm_oss.transactionIndices': config['apm_oss.transactionIndices'],
    'apm_oss.metricsIndices': config['apm_oss.metricsIndices'],
    /* eslint-enable @typescript-eslint/naming-convention */
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
}) {
  try {
    const apmIndicesSavedObject = await getApmIndicesSavedObject(
      savedObjectsClient
    );
    const apmIndicesConfig = getApmIndicesConfig(config);
    return mergeApmIndicesConfigs(apmIndicesConfig, apmIndicesSavedObject);
  } catch (error) {
    return getApmIndicesConfig(config);
  }
}

function mergeApmIndicesConfigs(
  apmIndicesConfig: ApmIndicesConfig,
  apmIndicesSavedObject: PromiseReturnType<typeof getApmIndicesSavedObject>
) {
  return APM_UI_INDICES.reduce(
    (mergedConfigs, savedIndexConfig) => {
      const savedApmIndex =
        apmIndicesSavedObject[savedIndexConfig[0]] ||
        apmIndicesSavedObject[savedIndexConfig[1]]; // TODO remove deprecated apm_oss support in 8.0
      return {
        ...mergedConfigs,
        [savedIndexConfig[0]]: savedApmIndex,
        [savedIndexConfig[1]]: savedApmIndex,
      };
    },
    { ...apmIndicesConfig }
  );
}

const APM_UI_INDICES: Array<[ApmIndicesName, ApmIndicesName]> = [
  ['xpack.apm.sourcemapIndices', 'apm_oss.sourcemapIndices'],
  ['xpack.apm.errorIndices', 'apm_oss.errorIndices'],
  ['xpack.apm.onboardingIndices', 'apm_oss.onboardingIndices'],
  ['xpack.apm.spanIndices', 'apm_oss.spanIndices'],
  ['xpack.apm.transactionIndices', 'apm_oss.transactionIndices'],
  ['xpack.apm.metricsIndices', 'apm_oss.metricsIndices'],
];

export async function getApmIndexSettings({
  context,
  config,
}: Pick<APMRouteHandlerResources, 'context' | 'config'>) {
  let apmIndicesSavedObject: PromiseReturnType<typeof getApmIndicesSavedObject>;
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

  return APM_UI_INDICES.map(
    ([configurationName, deprecatedConfigurationName]) => ({
      configurationName,
      defaultValue: apmIndicesConfig[configurationName], // value defined in kibana[.dev].yml
      savedValue:
        apmIndicesSavedObject[configurationName] ||
        apmIndicesSavedObject[deprecatedConfigurationName], // value saved via Saved Objects service
    })
  );
}
