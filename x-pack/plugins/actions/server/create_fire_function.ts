/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionTypeService } from './action_type_service';
import { EncryptedSavedObjectsPlugin } from '../../encrypted_saved_objects';

interface CreateFireFunctionOptions {
  actionTypeService: ActionTypeService;
  encryptedSavedObjectsPlugin: EncryptedSavedObjectsPlugin;
}

interface FireOptions {
  id: string;
  params: Record<string, any>;
  namespace?: string;
}

export function createFireFunction({
  actionTypeService,
  encryptedSavedObjectsPlugin,
}: CreateFireFunctionOptions) {
  return async function fire({ id, params, namespace }: FireOptions) {
    const action = await encryptedSavedObjectsPlugin.getDecryptedAsInternalUser('action', id, {
      namespace,
    });
    const mergedActionTypeConfig = {
      ...action.attributes.actionTypeConfig,
      ...action.attributes.actionTypeConfigSecrets,
    };
    return await actionTypeService.execute({
      id: action.attributes.actionTypeId,
      actionTypeConfig: mergedActionTypeConfig,
      params,
    });
  };
}
