/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract, SavedObject } from '@kbn/core/server';
import { SavedObjectsGetOptions } from '@kbn/core-saved-objects-api-server';
import { RULE_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import { RuleAttributes } from '../types';

export interface GetRuleSoParams {
  savedObjectsClient: SavedObjectsClientContract;
  id: string;
  savedObjectsGetOptions?: SavedObjectsGetOptions;
}

export const getRuleSo = (params: GetRuleSoParams): Promise<SavedObject<RuleAttributes>> => {
  const { savedObjectsClient, id, savedObjectsGetOptions } = params;

  return savedObjectsClient.get<RuleAttributes>(RULE_SAVED_OBJECT_TYPE, id, savedObjectsGetOptions);
};
