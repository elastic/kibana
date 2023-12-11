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

export type SyntheticsMonitorWithSecretsAttributes860 = Omit<
  SyntheticsMonitorWithSecretsAttributes,
  ConfigKey.MAX_ATTEMPTS
>;

export type SyntheticsUnsanitizedDoc860 =
  SavedObjectUnsanitizedDoc<SyntheticsMonitorWithSecretsAttributes860>;

export const migration860 = (encryptedSavedObjects: EncryptedSavedObjectsPluginSetup) => {
  return encryptedSavedObjects.createMigration<
    SyntheticsMonitorWithSecretsAttributes860,
    SyntheticsMonitorWithSecretsAttributes860
  >({
    isMigrationNeededPredicate: function shouldBeMigrated(doc): doc is SyntheticsUnsanitizedDoc860 {
      return true;
    },
    migration: (doc: SyntheticsUnsanitizedDoc860): SyntheticsUnsanitizedDoc860 => {
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
