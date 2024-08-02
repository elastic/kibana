/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import {
  ConnectorConfiguration,
  SyncJobType,
  CONNECTORS_INDEX,
  startConnectorSync,
  fetchConnectorById,
} from '@kbn/search-connectors';

import { isConfigEntry } from '../../../common/connectors/is_category_entry';

import { ENTERPRISE_SEARCH_CONNECTOR_CRAWLER_SERVICE_TYPE } from '../../../common/constants';

import { ErrorCode } from '../../../common/types/error_codes';

export const startSync = async (
  client: IScopedClusterClient,
  connectorId: string,
  jobType: SyncJobType,
  nextSyncConfig?: string // only processed for elastic-crawler service types
) => {
  const connector = await fetchConnectorById(client.asCurrentUser, connectorId);

  if (connector) {
    const config = Object.entries(connector.configuration).reduce((acc, [key, configEntry]) => {
      if (isConfigEntry(configEntry)) {
        acc[key] = configEntry;
      }
      return acc;
    }, {} as ConnectorConfiguration);
    const configuration = nextSyncConfig
      ? {
          ...config,
          nextSyncConfig: { label: 'nextSyncConfig', value: nextSyncConfig },
        }
      : config;

    if (
      jobType === SyncJobType.ACCESS_CONTROL &&
      !configuration.use_document_level_security?.value
    ) {
      throw new Error(ErrorCode.ACCESS_CONTROL_DISABLED);
    }

    if (connector.service_type === ENTERPRISE_SEARCH_CONNECTOR_CRAWLER_SERVICE_TYPE) {
      // Crawler-specific actions are not migrated to Connector API
      return await client.asCurrentUser.update({
        doc: {
          configuration,
          sync_now: true,
        },
        id: connectorId,
        index: CONNECTORS_INDEX,
      });
    }

    return await startConnectorSync(client.asCurrentUser, {
      connectorId,
      jobType,
    });
  } else {
    throw new Error(ErrorCode.RESOURCE_NOT_FOUND);
  }
};
