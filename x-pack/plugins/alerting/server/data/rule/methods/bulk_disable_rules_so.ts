/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObjectsClientContract,
  SavedObjectsCreateOptions,
  SavedObjectsBulkCreateObject,
  SavedObjectsBulkResponse,
} from '@kbn/core/server';
import { RawRule } from '../../../types';

export interface BulkDisableRulesSoParams {
  savedObjectsClient: SavedObjectsClientContract;
  bulkDisableRuleAttributes: Array<SavedObjectsBulkCreateObject<RawRule>>;
  savedObjectsBulkCreateOptions?: SavedObjectsCreateOptions;
}

export const bulkDisableRulesSo = (
  params: BulkDisableRulesSoParams
): Promise<SavedObjectsBulkResponse<RawRule>> => {
  const { savedObjectsClient, bulkDisableRuleAttributes, savedObjectsBulkCreateOptions } = params;

  return savedObjectsClient.bulkCreate<RawRule>(
    bulkDisableRuleAttributes,
    savedObjectsBulkCreateOptions
  );
};
