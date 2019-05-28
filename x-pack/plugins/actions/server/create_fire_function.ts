/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionTypeRegistry } from './action_type_registry';
import { EncryptedSavedObjectsPlugin } from '../../encrypted_saved_objects';

interface CreateFireFunctionOptions {
  actionTypeRegistry: ActionTypeRegistry;
  encryptedSavedObjectsPlugin: EncryptedSavedObjectsPlugin;
}

interface FireOptions {
  id: string;
  params: Record<string, any>;
  namespace?: string;
}

export function createFireFunction({
  actionTypeRegistry,
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
    return await actionTypeRegistry.execute({
      id: action.attributes.actionTypeId,
      actionTypeConfig: mergedActionTypeConfig,
      params,
    });
  };
}
