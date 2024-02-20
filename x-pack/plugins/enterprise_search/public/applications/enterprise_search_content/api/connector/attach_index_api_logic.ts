/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Actions, createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface AttachIndexApiLogicArgs {
  connectorId: string;
  indexName: string;
  isNative: boolean;
}

export const attachIndex = async ({
  connectorId,
  indexName,
  isNative,
}: AttachIndexApiLogicArgs): Promise<void> => {
  const route = `/internal/enterprise_search/connectors/${connectorId}/index_name/${indexName}`;

  await HttpLogic.values.http.put(route, {
    body: JSON.stringify({
      is_native: isNative,
    }),
  });
};

export const AttachIndexApiLogic = createApiLogic(['add_connector_api_logic'], attachIndex);

export type AttachIndexApiLogicActions = Actions<AttachIndexApiLogicArgs, {}>;
