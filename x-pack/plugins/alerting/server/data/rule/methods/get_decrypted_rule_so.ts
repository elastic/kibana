/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from '@kbn/core/server';
import { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import { SavedObjectsGetOptions } from '@kbn/core-saved-objects-api-server';
import { RawRule } from '../../../types';
import { RULE_SAVED_OBJECT_TYPE } from '../../../saved_objects';

export interface GetDecryptedRuleSoParams {
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
  id: string;
  savedObjectsGetOptions?: SavedObjectsGetOptions;
}

export const getDecryptedRuleSo = (
  params: GetDecryptedRuleSoParams
): Promise<SavedObject<RawRule>> => {
  const { id, encryptedSavedObjectsClient, savedObjectsGetOptions } = params;

  return encryptedSavedObjectsClient.getDecryptedAsInternalUser<RawRule>(
    RULE_SAVED_OBJECT_TYPE,
    id,
    savedObjectsGetOptions
  );
};
