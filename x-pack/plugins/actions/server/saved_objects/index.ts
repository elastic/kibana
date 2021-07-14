/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObject,
  SavedObjectsExportTransformContext,
  SavedObjectsServiceSetup,
  SavedObjectsTypeMappingDefinition,
} from 'kibana/server';
import { EncryptedSavedObjectsPluginSetup } from '../../../encrypted_saved_objects/server';
import mappings from './mappings.json';
import { getMigrations } from './migrations';
import { RawAction } from '../types';
import { getImportWarnings } from './get_import_warnings';
import { transformConnectorsForExport } from './transform_connectors_for_export';
import { ActionTypeRegistry } from '../action_type_registry';
import {
  ACTION_SAVED_OBJECT_TYPE,
  ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
} from '../constants/saved_objects';

export function setupSavedObjects(
  savedObjects: SavedObjectsServiceSetup,
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup,
  actionTypeRegistry: ActionTypeRegistry
) {
  savedObjects.registerType({
    name: ACTION_SAVED_OBJECT_TYPE,
    hidden: true,
    namespaceType: 'single',
    mappings: mappings.action as SavedObjectsTypeMappingDefinition,
    migrations: getMigrations(encryptedSavedObjects),
    management: {
      defaultSearchField: 'name',
      importableAndExportable: true,
      getTitle(savedObject: SavedObject<RawAction>) {
        return `Connector: [${savedObject.attributes.name}]`;
      },
      onExport<RawAction>(
        context: SavedObjectsExportTransformContext,
        objects: Array<SavedObject<RawAction>>
      ) {
        return transformConnectorsForExport(objects, actionTypeRegistry);
      },
      onImport(connectors) {
        return {
          warnings: getImportWarnings(connectors as Array<SavedObject<RawAction>>),
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
    mappings: mappings.action_task_params as SavedObjectsTypeMappingDefinition,
  });
  encryptedSavedObjects.registerType({
    type: ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
    attributesToEncrypt: new Set(['apiKey']),
  });
}
