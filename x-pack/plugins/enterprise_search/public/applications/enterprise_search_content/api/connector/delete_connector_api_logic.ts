/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export const deleteConnector = async (connectorId: string) => {
  return await HttpLogic.values.http.delete(
    '/internal/enterprise_search/connectors/{connectorId}',
    {
      query: {
        connectorId,
      },
    }
  );
};

export const DeleteConnectorApiLogic = createApiLogic(
  ['delete_connector_api_logic'],
  deleteConnector
);
