/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClient } from 'kibana/server';
import { ApmIndicesConfig, getApmIndices } from './get_apm_indices';
import { APMConfig } from '../../../index';

type ISavedObjectsClient = Pick<SavedObjectsClient, 'get'>;

interface ApmIndicesSettings {
  indices?: ApmIndicesConfig;
  getIndices: (attr: {
    config: APMConfig;
    savedObjectsClient: ISavedObjectsClient;
  }) => Promise<ApmIndicesConfig>;
  refetch: (attr: {
    config: APMConfig;
    savedObjectsClient: ISavedObjectsClient;
  }) => Promise<ApmIndicesConfig>;
  reset: (attr: {
    config: APMConfig;
    savedObjectsClient: ISavedObjectsClient;
  }) => void;
  resetScheduled: NodeJS.Timeout | null;
}

export const apmIndicesSettings: ApmIndicesSettings = {
  getIndices: async ({
    config,
    savedObjectsClient,
  }: {
    config: APMConfig;
    savedObjectsClient: ISavedObjectsClient;
  }) => {
    if (apmIndicesSettings.indices) {
      // non blocking call
      apmIndicesSettings.reset({ config, savedObjectsClient });

      return apmIndicesSettings.indices;
    }
    return apmIndicesSettings.refetch({ config, savedObjectsClient });
  },
  refetch: async ({
    config,
    savedObjectsClient,
  }: {
    config: APMConfig;
    savedObjectsClient: ISavedObjectsClient;
  }) => {
    apmIndicesSettings.indices = await getApmIndices({
      savedObjectsClient,
      config,
    });
    return apmIndicesSettings.indices!;
  },
  resetScheduled: null,
  reset: ({
    config,
    savedObjectsClient,
  }: {
    config: APMConfig;
    savedObjectsClient: ISavedObjectsClient;
  }) => {
    if (!apmIndicesSettings.resetScheduled) {
      apmIndicesSettings.resetScheduled = setTimeout(() => {
        apmIndicesSettings.refetch({ config, savedObjectsClient });
        apmIndicesSettings.resetScheduled = null;
      }, 60 * 1000);
    }
  },
};
