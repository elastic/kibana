/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract, SavedObjectsDeleteOptions } from '@kbn/core/server';

export interface DeleteRuleSoParams {
  savedObjectsClient: SavedObjectsClientContract;
  id: string;
  savedObjectsDeleteOptions?: SavedObjectsDeleteOptions;
}

export const deleteRuleSo = (params: DeleteRuleSoParams): Promise<{}> => {
  const { savedObjectsClient, id, savedObjectsDeleteOptions } = params;

  return savedObjectsClient.delete('alert', id, savedObjectsDeleteOptions);
};
