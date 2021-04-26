/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsServiceSetup } from 'kibana/server';
import { i18n } from '@kbn/i18n';
import { EncryptedSavedObjectsPluginSetup } from '../../../encrypted_saved_objects/server';
import mappings from './mappings.json';
import { getMigrations } from './migrations';

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
      onExport(ctx, objs) {
        return objs.map((obj) => {
          return {
            ...obj,
            attributes: {
              ...obj.attributes,
              isMissingSecrets: false,
            },
          };
        });
      },
      onImport(objs) {
        return {
          warnings: [
            {
              type: 'action_required',
              // message: `${objs.length} Connectors have been imported but need to be enabled`,
              message: i18n.translate('xpack.actions.savedObjects.onImportText', {
                defaultMessage:
                  '{objsLength} {objsLength, plural, one {Connector} other {Connectors}} have been imported but need to be enabled',
                values: {
                  objsLength: objs.length,
                },
              }),
              actionPath: '/app/management/insightsAndAlerting/triggersActions/connectors',
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
