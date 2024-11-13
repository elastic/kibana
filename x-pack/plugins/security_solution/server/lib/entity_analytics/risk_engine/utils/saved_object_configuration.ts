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
import type { Range } from '../../../../../common/entity_analytics/risk_engine';

export interface SavedObjectsClientArg {
  savedObjectsClient: SavedObjectsClientContract;
}

const getDefaultRiskEngineConfiguration = ({
  namespace,
  range,
  includeClosedAlerts,
}: {
  namespace: string;
  range: Range;
  includeClosedAlerts: boolean;
}): RiskEngineConfiguration => ({
  dataViewId: getAlertsIndex(namespace),
  enabled: false,
  filter: {},
  identifierType: undefined,
  interval: '1h',
  pageSize: 3_500,
  range,
  includeClosedAlerts,
});

const getConfigurationSavedObject = async ({
  savedObjectsClient,
}: SavedObjectsClientArg): Promise<SavedObject<RiskEngineConfiguration> | undefined> => {
  const savedObjectsResponse = await savedObjectsClient.find<RiskEngineConfiguration>({
    type: riskEngineConfigurationTypeName,
  });
  return savedObjectsResponse.saved_objects?.[0];
};

export const updateSavedObjectAttribute = async ({
  savedObjectsClient,
  attributes,
}: SavedObjectsClientArg & {
  attributes: {
    enabled?: boolean;
    dataViewId?: string;
    filter?: object;
    identifierType?: string;
    interval?: string;
    pageSize?: number;
    alertSampleSizePerShard?: number;
    range?: {
      start?: string;
      end?: string;
    };
    excludeAlertStatuses?: Array<'open' | 'closed' | 'in-progress' | 'acknowledged'>;
    excludeAlertTags?: Array<'Duplicate' | 'False Positive' | 'Futher investigation required'>;
    includeClosedAlerts?: boolean;
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
  range,
  includeClosedAlerts,
}: SavedObjectsClientArg & { namespace: string; range: Range; includeClosedAlerts: boolean }) => {
  const configuration = await getConfigurationSavedObject({ savedObjectsClient });
  if (configuration) {
    const result = await updateSavedObjectAttribute({
      savedObjectsClient,
      attributes: {
        range,
        includeClosedAlerts,
      },
    });
    return result;
  }
  const result = await savedObjectsClient.create(
    riskEngineConfigurationTypeName,
    getDefaultRiskEngineConfiguration({ namespace, range, includeClosedAlerts }),
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
