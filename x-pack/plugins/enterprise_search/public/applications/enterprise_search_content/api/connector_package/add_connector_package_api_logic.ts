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

export interface AddConnectorPackageApiLogicArgs {
  deleteExistingConnector?: boolean;
  indexName: string;
  language: string | null;
}

export interface AddConnectorPackageApiLogicResponse {
  id: string;
  indexName: string;
}

export const addConnectorPackage = async ({
  deleteExistingConnector,
  indexName,
  language,
}: AddConnectorPackageApiLogicArgs): Promise<AddConnectorPackageApiLogicResponse> => {
  const route = '/internal/enterprise_search/connectors';

  const deleteParam = deleteExistingConnector
    ? { delete_existing_connector: deleteExistingConnector }
    : {};
  const params = {
    ...deleteParam,
    index_name: indexName,
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

export const AddConnectorPackageApiLogic = createApiLogic(
  ['add_connector_package_api_logic'],
  addConnectorPackage
);
