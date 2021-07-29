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
  SavedObjectsType,
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
import { getOldestIdleActionTask } from '../../../task_manager/server';

export function setupSavedObjects(
  savedObjects: SavedObjectsServiceSetup,
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup,
  actionTypeRegistry: ActionTypeRegistry,
  taskManagerIndex: string,
  kibanaVersion: string
) {
  const useSharableSavedObjectNamespaceType = kibanaVersion === '8.0.0';
  const namespaceType = useSharableSavedObjectNamespaceType ? 'multiple-isolated' : 'single';

  const actionType: SavedObjectsType<RawAction> = {
    name: ACTION_SAVED_OBJECT_TYPE,
    hidden: true,
    namespaceType,
    convertToMultiNamespaceTypeVersion: '8.0.0',
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
      onImport(connectors: Array<SavedObject<RawAction>>) {
        return {
          warnings: getImportWarnings(connectors as Array<SavedObject<RawAction>>),
        };
      },
    },
  };
  if (useSharableSavedObjectNamespaceType) {
    actionType.convertToMultiNamespaceTypeVersion = '8.0.0';
  }
  savedObjects.registerType(actionType);

  // Encrypted attributes
  // - `secrets` properties will be encrypted
  // - `config` will be included in AAD
  // - everything else excluded from AAD
  encryptedSavedObjects.registerType({
    type: ACTION_SAVED_OBJECT_TYPE,
    attributesToEncrypt: new Set(['secrets']),
    attributesToExcludeFromAAD: new Set(['name']),
  });

  const actionTaskParamsType: SavedObjectsType<RawAction> = {
    name: ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
    hidden: true,
    namespaceType,
    convertToMultiNamespaceTypeVersion: '8.0.0',
    mappings: mappings.action_task_params as SavedObjectsTypeMappingDefinition,
    excludeOnUpgrade: async ({ readonlyEsClient }) => {
      const oldestIdleActionTask = await getOldestIdleActionTask(
        readonlyEsClient,
        taskManagerIndex
      );
      return {
        bool: {
          must: [
            { term: { type: 'action_task_params' } },
            { range: { updated_at: { lt: oldestIdleActionTask } } },
          ],
        },
      };
    },
  };
  if (useSharableSavedObjectNamespaceType) {
    actionTaskParamsType.convertToMultiNamespaceTypeVersion = '8.0.0';
  }
  savedObjects.registerType(actionTaskParamsType);
  encryptedSavedObjects.registerType({
    type: ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
    attributesToEncrypt: new Set(['apiKey']),
  });
}
