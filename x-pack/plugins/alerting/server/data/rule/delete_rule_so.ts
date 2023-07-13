/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract, SavedObjectsDeleteOptions } from '@kbn/core/server';

export interface DeleteRuleSoParams {
  savedObjectClient: SavedObjectsClientContract;
  id: string;
  savedObjectDeleteOptions?: SavedObjectsDeleteOptions;
}

export const deleteRuleSo = (params: DeleteRuleSoParams): Promise<{}> => {
  const { savedObjectClient, id, savedObjectDeleteOptions } = params;

  return savedObjectClient.delete('alert', id, savedObjectDeleteOptions);
};
