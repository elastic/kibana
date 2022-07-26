/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorConfiguration } from '../../../../../common/types/connectors';
import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface PostConnectorConfigurationArgs {
  configuration: ConnectorConfiguration;
  connectorId: string;
  indexName: string;
}

export interface PostConnectorConfigurationResponse {
  configuration: ConnectorConfiguration;
  indexName: string;
}

export const postConnectorConfiguration = async ({
  configuration,
  connectorId,
  indexName,
}: PostConnectorConfigurationArgs) => {
  const route = `/internal/enterprise_search/connectors/${connectorId}/configuration`;

  await HttpLogic.values.http.post<ConnectorConfiguration>(route, {
    body: JSON.stringify(configuration),
  });
  return { configuration, indexName };
};

export const ConnectorConfigurationApiLogic = createApiLogic(
  ['content', 'configuration_connector_api_logic'],
  postConnectorConfiguration
);
