/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface DeleteIndexApiLogicArgs {
  indexName: string;
}

export const deleteIndex = async ({ indexName }: DeleteIndexApiLogicArgs): Promise<void> => {
  const route = `/internal/enterprise_search/indices/${indexName}`;
  await HttpLogic.values.http.delete(route);
  return;
};

export const DeleteIndexApiLogic = createApiLogic(['delete_index_api_logic'], deleteIndex);
