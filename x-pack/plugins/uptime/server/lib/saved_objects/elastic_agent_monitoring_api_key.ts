/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  SavedObjectsClientContract,
  SavedObjectsErrorHelpers,
  SavedObjectsType,
} from '../../../../../../src/core/server';
import { ElasticAgentMonitoringApiKey } from '../../../common/runtime_types/elastic_agent_monitoring_api_key';
import { EncryptedSavedObjectsClient } from '../../../../encrypted_saved_objects/server';

export const elasticAgentMonitoringApiKeyID = '438aa296-3227-41fc-9325-ad571c42d900';
export const elasticAgentMonitoringApiKeyObjectType = 'uptime-elastic-agent-monitoring-api-key';

export const elasticAgentMonitoringApiKey: SavedObjectsType = {
  name: elasticAgentMonitoringApiKeyObjectType,
  hidden: true,
  namespaceType: 'single',
  mappings: {
    dynamic: false,
    properties: {
      apiKey: {
        type: 'binary',
      },
      /* Leaving these commented to make it clear that these fields exist, even though we don't want them indexed.
         When adding new fields please add them here. If they need to be searchable put them in the uncommented
         part of properties.
      id: {
        type: 'keyword',
      },
      name: {
        type: 'long',
      },
      */
    },
  },
  management: {
    importableAndExportable: false,
    icon: 'uptimeApp',
    getTitle: () =>
      i18n.translate('xpack.uptime.elasticAgentMonitoring.service.apiKey', {
        defaultMessage: 'Elastic Agent Monitoring service api key',
      }),
  },
};

export const getElasticAgentMonitoringAPIKey = async (client: EncryptedSavedObjectsClient) => {
  try {
    const obj = await client.getDecryptedAsInternalUser<ElasticAgentMonitoringApiKey>(
      elasticAgentMonitoringApiKey.name,
      elasticAgentMonitoringApiKeyID
    );
    return obj?.attributes;
  } catch (getErr) {
    if (SavedObjectsErrorHelpers.isNotFoundError(getErr)) {
      return undefined;
    }
    throw getErr;
  }
};
export const setElasticAgentMonitoringAPIKey = async (
  client: SavedObjectsClientContract,
  apiKey: ElasticAgentMonitoringApiKey
) => {
  await client.create(elasticAgentMonitoringApiKey.name, apiKey, {
    id: elasticAgentMonitoringApiKeyID,
    overwrite: true,
  });
};
