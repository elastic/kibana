/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import type { AuthenticatedUser } from '@kbn/security-plugin/common/model';

import type { RiskEngineConfiguration } from '../types';
import { riskEngineConfigurationTypeName } from '../saved_object';

export interface SavedObjectsClients {
  savedObjectsClient: SavedObjectsClientContract;
}

export interface UpdateConfigOpts extends SavedObjectsClients {
  user: AuthenticatedUser | null | undefined;
}

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
