/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObjectsClientContract,
  SavedObjectsUpdateOptions,
  SavedObjectsUpdateResponse,
} from '@kbn/core/server';
import { RULE_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import { RuleAttributes } from '../types';

export interface UpdateRuleSoParams {
  savedObjectsClient: SavedObjectsClientContract;
  id: string;
  updateRuleAttributes: Partial<RuleAttributes>;
  savedObjectsUpdateOptions?: SavedObjectsUpdateOptions<RuleAttributes>;
}

export const updateRuleSo = (
  params: UpdateRuleSoParams
): Promise<SavedObjectsUpdateResponse<RuleAttributes>> => {
  const { savedObjectsClient, id, updateRuleAttributes, savedObjectsUpdateOptions } = params;

  return savedObjectsClient.update<RuleAttributes>(
    RULE_SAVED_OBJECT_TYPE,
    id,
    updateRuleAttributes,
    savedObjectsUpdateOptions
  );
};
