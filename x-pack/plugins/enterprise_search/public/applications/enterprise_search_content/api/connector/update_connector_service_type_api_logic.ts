/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorConfiguration } from '../../../../../common/types/connectors';
import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface PutConnectorServiceTypeArgs {
  connectorId: string;
  serviceType: string;
}

export interface PutConnectorServiceTypeResponse {
  connectorId: string;
  serviceType: string;
}

export const setServiceType = async ({ connectorId, serviceType }: PutConnectorServiceTypeArgs) => {
  const route = `/internal/enterprise_search/connectors/${connectorId}/service_type`;

  await HttpLogic.values.http.put<ConnectorConfiguration>(route, {
    body: JSON.stringify({ serviceType }),
  });
  return { serviceType, connectorId };
};

export const ServiceTypeConnectorApiLogic = createApiLogic(
  ['content', 'service_type_connector_api_logic'],
  setServiceType
);
