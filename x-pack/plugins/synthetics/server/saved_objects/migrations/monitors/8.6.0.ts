/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import { SavedObjectUnsanitizedDoc } from '@kbn/core/server';
import {
  ConfigKey,
  SyntheticsMonitorWithSecretsAttributes,
} from '../../../../common/runtime_types';
import { LEGACY_SYNTHETICS_MONITOR_ENCRYPTED_TYPE } from '../../synthetics_monitor';

export const migration860 = (encryptedSavedObjects: EncryptedSavedObjectsPluginSetup) => {
  return encryptedSavedObjects.createMigration<
    SyntheticsMonitorWithSecretsAttributes,
    SyntheticsMonitorWithSecretsAttributes
  >({
    isMigrationNeededPredicate: function shouldBeMigrated(
      doc
    ): doc is SavedObjectUnsanitizedDoc<SyntheticsMonitorWithSecretsAttributes> {
      return true;
    },
    migration: (
      doc: SavedObjectUnsanitizedDoc<SyntheticsMonitorWithSecretsAttributes>
    ): SavedObjectUnsanitizedDoc<SyntheticsMonitorWithSecretsAttributes> => {
      const { attributes, id } = doc;
      return {
        ...doc,
        attributes: {
          ...attributes,
          [ConfigKey.MONITOR_QUERY_ID]: attributes[ConfigKey.CUSTOM_HEARTBEAT_ID] || id,
          [ConfigKey.CONFIG_ID]: id,
        },
      };
    },
    inputType: LEGACY_SYNTHETICS_MONITOR_ENCRYPTED_TYPE,
    migratedType: LEGACY_SYNTHETICS_MONITOR_ENCRYPTED_TYPE,
  });
};
