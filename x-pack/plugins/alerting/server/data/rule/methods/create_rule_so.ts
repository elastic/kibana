/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObjectsClientContract,
  SavedObjectsCreateOptions,
  SavedObject,
} from '@kbn/core/server';
import { RawRule } from '../../../types';
import { RULE_SAVED_OBJECT_TYPE } from '../../../saved_objects';

export interface CreateRuleSoParams {
  savedObjectsClient: SavedObjectsClientContract;
  ruleAttributes: RawRule;
  savedObjectsCreateOptions?: SavedObjectsCreateOptions;
}

export const createRuleSo = (params: CreateRuleSoParams): Promise<SavedObject<RawRule>> => {
  const { savedObjectsClient, ruleAttributes, savedObjectsCreateOptions } = params;

  return savedObjectsClient.create(
    RULE_SAVED_OBJECT_TYPE,
    ruleAttributes,
    savedObjectsCreateOptions
  );
};
