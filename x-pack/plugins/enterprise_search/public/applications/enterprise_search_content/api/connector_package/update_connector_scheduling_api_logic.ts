/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';
import { ConnectorScheduling } from '../index/fetch_index_api_logic';

export interface UpdateConnectorSchedulingArgs {
  connectorId: string;
  scheduling: ConnectorScheduling;
}

export const updateConnectorScheduling = async ({
  connectorId,
  scheduling: { enabled, interval },
}: UpdateConnectorSchedulingArgs) => {
  const route = `/internal/enterprise_search/connectors/${connectorId}/scheduling`;

  await HttpLogic.values.http.post<undefined>(route, {
    body: JSON.stringify({ enabled, interval }),
  });
  return { enabled, interval };
};

export const UpdateConnectorSchedulingApiLogic = createApiLogic(
  ['content', 'update_connector_scheduling_api_logic'],
  updateConnectorScheduling
);
