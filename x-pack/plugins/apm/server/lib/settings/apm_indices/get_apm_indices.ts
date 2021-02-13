/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';

import { SavedObjectsClient } from 'src/core/server';
import { PromiseReturnType } from '../../../../../observability/typings/common';
import {
  APM_INDICES_SAVED_OBJECT_TYPE,
  APM_INDICES_SAVED_OBJECT_ID,
} from '../../../../common/apm_saved_object_constants';
import { APMConfig } from '../../..';
import { APMRequestHandlerContext } from '../../../routes/typings';

type ISavedObjectsClient = Pick<SavedObjectsClient, 'get'>;

export interface ApmIndicesConfig {
  /* eslint-disable @typescript-eslint/naming-convention */
  'apm_oss.sourcemapIndices': string;
  'apm_oss.errorIndices': string;
  'apm_oss.onboardingIndices': string;
  'apm_oss.spanIndices': string;
  'apm_oss.transactionIndices': string;
  'apm_oss.metricsIndices': string;
  /* eslint-enable @typescript-eslint/naming-convention */
  apmAgentConfigurationIndex: string;
  apmCustomLinkIndex: string;
}

export type ApmIndicesName = keyof ApmIndicesConfig;

async function getApmIndicesSavedObject(
  savedObjectsClient: ISavedObjectsClient
) {
  const apmIndices = await savedObjectsClient.get<Partial<ApmIndicesConfig>>(
    APM_INDICES_SAVED_OBJECT_TYPE,
    APM_INDICES_SAVED_OBJECT_ID
  );
  return apmIndices.attributes;
}

export function getApmIndicesConfig(config: APMConfig): ApmIndicesConfig {
  return {
    /* eslint-disable @typescript-eslint/naming-convention */
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
    return merge({}, apmIndicesConfig, apmIndicesSavedObject);
  } catch (error) {
    return getApmIndicesConfig(config);
  }
}

const APM_UI_INDICES: ApmIndicesName[] = [
  'apm_oss.sourcemapIndices',
  'apm_oss.errorIndices',
  'apm_oss.onboardingIndices',
  'apm_oss.spanIndices',
  'apm_oss.transactionIndices',
  'apm_oss.metricsIndices',
];

export async function getApmIndexSettings({
  context,
}: {
  context: APMRequestHandlerContext;
}) {
  let apmIndicesSavedObject: PromiseReturnType<typeof getApmIndicesSavedObject>;
  try {
    apmIndicesSavedObject = await getApmIndicesSavedObject(
      context.core.savedObjects.client
    );
  } catch (error) {
    if (error.output && error.output.statusCode === 404) {
      apmIndicesSavedObject = {};
    } else {
      throw error;
    }
  }
  const apmIndicesConfig = getApmIndicesConfig(context.config);

  return APM_UI_INDICES.map((configurationName) => ({
    configurationName,
    defaultValue: apmIndicesConfig[configurationName], // value defined in kibana[.dev].yml
    savedValue: apmIndicesSavedObject[configurationName], // value saved via Saved Objects service
  }));
}
