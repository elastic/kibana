/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';

import { CONNECTORS_INDEX } from '../..';

import { ConnectorDocument } from '../../../common/types/connectors';

export const updateConnectorServiceType = async (
  client: IScopedClusterClient,
  connectorId: string,
  serviceType: string
) => {
  const connectorResult = await client.asCurrentUser.get<ConnectorDocument>({
    id: connectorId,
    index: CONNECTORS_INDEX,
  });
  const connector = connectorResult._source;
  if (connector) {
    const result = await client.asCurrentUser.index<ConnectorDocument>({
      document: { ...connector, service_type: serviceType },
      id: connectorId,
      index: CONNECTORS_INDEX,
    });
    await client.asCurrentUser.indices.refresh({ index: CONNECTORS_INDEX });
    return result;
  } else {
    throw new Error(
      i18n.translate('xpack.enterpriseSearch.server.connectors.serviceType.error', {
        defaultMessage: 'Could not find document',
      })
    );
  }
};
