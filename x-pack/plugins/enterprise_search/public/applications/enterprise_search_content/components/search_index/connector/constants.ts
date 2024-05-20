/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';

import { ApiKey } from '../../../api/connector/generate_connector_api_key_api_logic';

export const getConnectorTemplate = ({
  apiKeyData,
  connectorData,
  host,
}: {
  apiKeyData: ApiKey | undefined;
  connectorData: {
    id: string;
    service_type: string | null;
  };
  host?: string;
}) => dedent`connectors:
  -
    connector_id: "${connectorData.id}"
    service_type: "${connectorData.service_type || 'changeme'}"${
  apiKeyData?.encoded
    ? `
    api_key: "${apiKeyData?.encoded}"`
    : ''
}

  elasticsearch:
    host: "${host || 'http://localhost:9200'}"
    api_key: "${apiKeyData?.encoded || ''}"
`;
