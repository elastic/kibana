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
  apiKey: string;
}

const addConnectorPackage = async ({ indexName }: { indexName: string }) => {
  const route = '/internal/enterprise_search/connectors';

  const params = {
    index_name: indexName,
  };
  return await HttpLogic.values.http.post<AddConnectorValue>(route, {
    body: JSON.stringify(params),
  });
};

export const AddConnectorPackageApiLogic = createApiLogic(
  ['add_connector_package_api_logic'],
  addConnectorPackage
);
