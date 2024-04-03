/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import {
  ConnectorConfiguration,
  ConnectorDocument,
  SyncJobType,
  CONNECTORS_INDEX,
  startConnectorSync,
} from '@kbn/search-connectors';

import { isConfigEntry } from '../../../common/connectors/is_category_entry';

import {
  CONNECTORS_ACCESS_CONTROL_INDEX_PREFIX,
  ENTERPRISE_SEARCH_CONNECTOR_CRAWLER_SERVICE_TYPE,
} from '../../../common/constants';

import { ErrorCode } from '../../../common/types/error_codes';

export const startSync = async (
  client: IScopedClusterClient,
  connectorId: string,
  jobType: SyncJobType,
  nextSyncConfig?: string // only processed for elastic-crawler service types
) => {
  const connectorResult = await client.asCurrentUser.get<ConnectorDocument>({
    id: connectorId,
    index: CONNECTORS_INDEX,
  });
  const connector = connectorResult._source;
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
    const { index_name } = connector;
    if (
      jobType === SyncJobType.ACCESS_CONTROL &&
      !configuration.use_document_level_security?.value
    ) {
      throw new Error(ErrorCode.ACCESS_CONTROL_DISABLED);
    }

    if (connector.service_type === ENTERPRISE_SEARCH_CONNECTOR_CRAWLER_SERVICE_TYPE) {
      return await client.asCurrentUser.update({
        doc: {
          configuration,
          sync_now: true,
        },
        id: connectorId,
        if_primary_term: connectorResult._primary_term,
        if_seq_no: connectorResult._seq_no,
        index: CONNECTORS_INDEX,
      });
    }

    const targetIndexName =
      jobType === SyncJobType.ACCESS_CONTROL
        ? `${CONNECTORS_ACCESS_CONTROL_INDEX_PREFIX}${index_name}`
        : index_name ?? undefined;

    return await startConnectorSync(client.asCurrentUser, {
      connectorId,
      jobType,
      targetIndexName,
    });
  } else {
    throw new Error(ErrorCode.RESOURCE_NOT_FOUND);
  }
};
