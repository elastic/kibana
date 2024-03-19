/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObjectsClientContract,
  SavedObjectsBulkDeleteOptions,
  SavedObjectsBulkDeleteResponse,
} from '@kbn/core/server';
import { RULE_SAVED_OBJECT_TYPE } from '../../../saved_objects';

export interface BulkDeleteRulesSoParams {
  savedObjectsClient: SavedObjectsClientContract;
  ids: string[];
  savedObjectsBulkDeleteOptions?: SavedObjectsBulkDeleteOptions;
}

export const bulkDeleteRulesSo = (
  params: BulkDeleteRulesSoParams
): Promise<SavedObjectsBulkDeleteResponse> => {
  const { savedObjectsClient, ids, savedObjectsBulkDeleteOptions } = params;

  return savedObjectsClient.bulkDelete(
    ids.map((id) => ({ id, type: RULE_SAVED_OBJECT_TYPE })),
    savedObjectsBulkDeleteOptions
  );
};
