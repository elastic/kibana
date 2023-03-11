/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';

import { CONNECTORS_INDEX } from '../..';
import { NATIVE_CONNECTOR_DEFINITIONS } from '../../../common/connectors/native_connectors';
import { Connector, ConnectorStatus } from '../../../common/types/connectors';

export const configureNativeConnector = async (
  client: IScopedClusterClient,
  connectorId: string,
  serviceType: string
): Promise<boolean> => {
  const nativeConnector = NATIVE_CONNECTOR_DEFINITIONS[serviceType];

  if (!nativeConnector) {
    throw new Error(`Could not find connector definition for service type ${serviceType}`);
  }

  const result = await client.asCurrentUser.update<Connector>({
    doc: {
      configuration: nativeConnector.configuration,
      features: nativeConnector.features,
      name: nativeConnector.name,
      service_type: serviceType,
      status: ConnectorStatus.NEEDS_CONFIGURATION,
    },
    id: connectorId,
    index: CONNECTORS_INDEX,
    refresh: true,
  });

  return result.result === 'updated' ? true : false;
};
