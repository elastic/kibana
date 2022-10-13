/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import { CONNECTORS_INDEX } from '../..';

import { ConnectorDocument } from '../../../common/types/connectors';
import { ErrorCode } from '../../../common/types/error_codes';

export const startConnectorSync = async (
  client: IScopedClusterClient,
  connectorId: string,
  nextSyncConfig?: string
) => {
  const connectorResult = await client.asCurrentUser.get<ConnectorDocument>({
    id: connectorId,
    index: CONNECTORS_INDEX,
  });
  const connector = connectorResult._source;
  if (connector) {
    if (nextSyncConfig) {
      connector.configuration.nextSyncConfig = { label: 'nextSyncConfig', value: nextSyncConfig };
    }

    const result = await client.asCurrentUser.index<ConnectorDocument>({
      document: {
        ...connector,
        sync_now: true,
      },
      id: connectorId,
      index: CONNECTORS_INDEX,
    });

    await client.asCurrentUser.indices.refresh({ index: CONNECTORS_INDEX });
    return result;
  } else {
    throw new Error(ErrorCode.RESOURCE_NOT_FOUND);
  }
};
