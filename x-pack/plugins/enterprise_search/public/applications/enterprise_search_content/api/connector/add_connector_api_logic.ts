/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

interface AddConnectorValue {
  id: string;
  index_name: string;
}

export interface AddConnectorApiLogicArgs {
  deleteExistingConnector?: boolean;
  indexName: string;
  isNative: boolean;
  language: string | null;
}

export interface AddConnectorApiLogicResponse {
  id: string;
  indexName: string;
}

export const addConnector = async ({
  deleteExistingConnector,
  indexName,
  isNative,
  language,
}: AddConnectorApiLogicArgs): Promise<AddConnectorApiLogicResponse> => {
  const route = '/internal/enterprise_search/connectors';

  const deleteParam = deleteExistingConnector
    ? { delete_existing_connector: deleteExistingConnector }
    : {};
  const params = {
    ...deleteParam,
    index_name: indexName,
    is_native: isNative,
    language,
  };
  const result = await HttpLogic.values.http.post<AddConnectorValue>(route, {
    body: JSON.stringify(params),
  });
  return {
    id: result.id,
    indexName: result.index_name,
  };
};

export const AddConnectorApiLogic = createApiLogic(['add_connector_api_logic'], addConnector);
