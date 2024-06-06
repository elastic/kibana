/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObject, SavedObjectsClientContract } from '@kbn/core/server';

import { getAlertsIndex } from '../../../../../common/utils/risk_score_modules';
import type { RiskEngineConfiguration } from '../../types';
import { riskEngineConfigurationTypeName } from '../saved_object';

export interface SavedObjectsClientArg {
  savedObjectsClient: SavedObjectsClientContract;
}

const getDefaultRiskEngineConfiguration = ({
  namespace,
}: {
  namespace: string;
}): RiskEngineConfiguration => ({
  dataViewId: getAlertsIndex(namespace),
  enabled: false,
  filter: {},
  identifierType: undefined,
  interval: '1h',
  pageSize: 3_500,
  range: { start: 'now-30d', end: 'now' },
});

const getConfigurationSavedObject = async ({
  savedObjectsClient,
}: SavedObjectsClientArg): Promise<SavedObject<RiskEngineConfiguration> | undefined> => {
  const savedObjectsResponse = await savedObjectsClient.find<RiskEngineConfiguration>({
    type: riskEngineConfigurationTypeName,
  });
  return savedObjectsResponse.saved_objects?.[0];
};

export const getEnabledRiskEngineAmount = async ({
  savedObjectsClient,
}: SavedObjectsClientArg): Promise<number> => {
  const savedObjectsResponse = await savedObjectsClient.find<RiskEngineConfiguration>({
    type: riskEngineConfigurationTypeName,
    namespaces: ['*'],
  });

  return savedObjectsResponse.saved_objects?.filter((config) => config?.attributes?.enabled)
    ?.length;
};

export const updateSavedObjectAttribute = async ({
  savedObjectsClient,
  attributes,
}: SavedObjectsClientArg & {
  attributes: {
    enabled: boolean;
  };
}) => {
  const savedObjectConfiguration = await getConfigurationSavedObject({
    savedObjectsClient,
  });

  if (!savedObjectConfiguration) {
    throw new Error('Risk engine configuration not found');
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

export const initSavedObjects = async ({
  namespace,
  savedObjectsClient,
}: SavedObjectsClientArg & { namespace: string }) => {
  const configuration = await getConfigurationSavedObject({ savedObjectsClient });
  if (configuration) {
    return configuration;
  }
  const result = await savedObjectsClient.create(
    riskEngineConfigurationTypeName,
    getDefaultRiskEngineConfiguration({ namespace }),
    {}
  );
  return result;
};

export const deleteSavedObjects = async ({
  savedObjectsClient,
}: SavedObjectsClientArg): Promise<void> => {
  const configuration = await getConfigurationSavedObject({ savedObjectsClient });
  if (configuration) {
    await savedObjectsClient.delete(riskEngineConfigurationTypeName, configuration.id);
  }
};

export const getConfiguration = async ({
  savedObjectsClient,
}: SavedObjectsClientArg): Promise<RiskEngineConfiguration | null> => {
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
