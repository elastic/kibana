/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import { SavedObjectUnsanitizedDoc } from '@kbn/core/server';
import { ConfigKey, SyntheticsMonitorWithSecrets } from '../../../../../../common/runtime_types';
import { SYNTHETICS_MONITOR_ENCRYPTED_TYPE } from '../../synthetics_monitor';

export const migration860 = (encryptedSavedObjects: EncryptedSavedObjectsPluginSetup) => {
  return encryptedSavedObjects.createMigration<
    SyntheticsMonitorWithSecrets,
    SyntheticsMonitorWithSecrets
  >({
    isMigrationNeededPredicate: function shouldBeMigrated(
      doc
    ): doc is SavedObjectUnsanitizedDoc<SyntheticsMonitorWithSecrets> {
      return true;
    },
    migration: (
      doc: SavedObjectUnsanitizedDoc<SyntheticsMonitorWithSecrets>
    ): SavedObjectUnsanitizedDoc<SyntheticsMonitorWithSecrets> => {
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
    migratedType: SYNTHETICS_MONITOR_ENCRYPTED_TYPE,
  });
};
