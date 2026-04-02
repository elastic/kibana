/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_ACTION_INDEX, HEADERS, PASSWORD, USERNAME } from './constants';
import { getKibanaUrl } from './get_kibana_url';

export const createIndexConnector = async () => {
  const INDEX_CONNECTOR_API = `${await getKibanaUrl()}/api/actions/connector`;
  const basicAuth = Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64');

  const indexConnectorParams = {
    name: 'Test Index Connector',
    config: {
      index: ALERT_ACTION_INDEX,
      refresh: true,
    },
    connector_type_id: '.index',
  };

  const response = await fetch(INDEX_CONNECTOR_API, {
    method: 'POST',
    body: JSON.stringify(indexConnectorParams),
    headers: {
      'content-type': 'application/json',
      ...HEADERS,
      Authorization: `Basic ${basicAuth}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Failed to create index connector: ${response.status} ${errorText}`);
  }

  return {
    status: response.status,
    data: await response.json(),
  };
};
