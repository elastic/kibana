/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject, SavedObjectsServiceSetup } from 'kibana/server';
import { EncryptedSavedObjectsPluginSetup } from '../../../encrypted_saved_objects/server';
import mappings from './mappings.json';
import { getMigrations } from './migrations';
import { RawAction } from '../types';
import { getImportResultMessage, GO_TO_CONNECTORS_BUTTON_LABLE } from './get_import_result_message';

export const ACTION_SAVED_OBJECT_TYPE = 'action';
export const ALERT_SAVED_OBJECT_TYPE = 'alert';
export const ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE = 'action_task_params';

export function setupSavedObjects(
  savedObjects: SavedObjectsServiceSetup,
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup
) {
  savedObjects.registerType({
    name: ACTION_SAVED_OBJECT_TYPE,
    hidden: true,
    namespaceType: 'single',
    mappings: mappings.action,
    migrations: getMigrations(encryptedSavedObjects),
    management: {
      defaultSearchField: 'name',
      importableAndExportable: true,
      getTitle(obj) {
        return `Connector: [${obj.attributes.name}]`;
      },
      onImport(connectors) {
        return {
          warnings: [
            {
              type: 'action_required',
              message: getImportResultMessage(connectors as Array<SavedObject<RawAction>>),
              actionPath: '/app/management/insightsAndAlerting/triggersActions/connectors',
              buttonLabel: GO_TO_CONNECTORS_BUTTON_LABLE,
            },
          ],
        };
      },
    },
  });

  // Encrypted attributes
  // - `secrets` properties will be encrypted
  // - `config` will be included in AAD
  // - everything else excluded from AAD
  encryptedSavedObjects.registerType({
    type: ACTION_SAVED_OBJECT_TYPE,
    attributesToEncrypt: new Set(['secrets']),
    attributesToExcludeFromAAD: new Set(['name']),
  });

  savedObjects.registerType({
    name: ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
    hidden: true,
    namespaceType: 'single',
    mappings: mappings.action_task_params,
  });
  encryptedSavedObjects.registerType({
    type: ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
    attributesToEncrypt: new Set(['apiKey']),
  });
}
