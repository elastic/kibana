/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';

import { CONNECTORS_INDEX } from '../..';

import {
  ConnectorConfiguration,
  ConnectorDocument,
  ConnectorStatus,
} from '../../../common/types/connectors';

export const updateConnectorConfiguration = async (
  client: IScopedClusterClient,
  connectorId: string,
  configuration: ConnectorConfiguration
) => {
  const connectorResult = await client.asCurrentUser.get<ConnectorDocument>({
    id: connectorId,
    index: CONNECTORS_INDEX,
  });
  const connector = connectorResult._source;
  if (connector) {
    const status =
      connector.status === ConnectorStatus.NEEDS_CONFIGURATION
        ? ConnectorStatus.CONFIGURED
        : connector.status;
    const result = await client.asCurrentUser.index<ConnectorDocument>({
      document: { ...connector, configuration, status },
      id: connectorId,
      index: CONNECTORS_INDEX,
    });
    await client.asCurrentUser.indices.refresh({ index: CONNECTORS_INDEX });
    return result;
  } else {
    throw new Error(
      i18n.translate('xpack.enterpriseSearch.server.connectors.configuration.error', {
        defaultMessage: 'Could not find document',
      })
    );
  }
};
