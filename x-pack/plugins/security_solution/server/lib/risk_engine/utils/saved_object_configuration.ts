/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObject } from '@kbn/core/server';

import type { RiskEngineConfiguration, UpdateConfigOpts, SavedObjectsClients } from '../types';
import { riskEngineConfigurationTypeName } from '../saved_object';

const getConfigurationSavedObject = async ({
  savedObjectsClient,
}: SavedObjectsClients): Promise<SavedObject<RiskEngineConfiguration> | undefined> => {
  const savedObjectsResponse = await savedObjectsClient.find<RiskEngineConfiguration>({
    type: riskEngineConfigurationTypeName,
  });
  return savedObjectsResponse.saved_objects?.[0];
};

export const updateSavedObjectAttribute = async ({
  savedObjectsClient,
  attributes,
  user,
}: UpdateConfigOpts & {
  attributes: {
    enabled: boolean;
  };
}) => {
  const savedObjectConfiguration = await getConfigurationSavedObject({
    savedObjectsClient,
  });

  if (!savedObjectConfiguration) {
    throw new Error('There no saved object configuration for risk engine');
  }

  const result = await savedObjectsClient.update(
    riskEngineConfigurationTypeName,
    savedObjectConfiguration.id,
    {
      ...attributes,
      last_updated_by: user?.username ?? '',
    },
    {
      refresh: 'wait_for',
    }
  );

  return result;
};

export const initSavedObjects = async ({ savedObjectsClient, user }: UpdateConfigOpts) => {
  const configuration = await getConfigurationSavedObject({ savedObjectsClient });
  if (configuration) {
    return configuration;
  }
  const result = await savedObjectsClient.create(riskEngineConfigurationTypeName, {
    enabled: false,
    last_updated_by: user?.username ?? '',
  });
  return result;
};

export const getConfiguration = async ({
  savedObjectsClient,
}: SavedObjectsClients): Promise<RiskEngineConfiguration | null> => {
  try {
    const savedObjectConfiguration = await getConfigurationSavedObject({
      savedObjectsClient,
    });
    const configuration = savedObjectConfiguration?.attributes;

    if (configuration) {
      return configuration;
    }

    return null;
  } catch (e) {
    return null;
  }
};
