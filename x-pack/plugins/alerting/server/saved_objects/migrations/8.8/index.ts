/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectUnsanitizedDoc } from '@kbn/core-saved-objects-server';
import { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import { createEsoMigration, isDetectionEngineAADRuleType, pipeMigrations } from '../utils';
import { RawRule } from '../../../types';

function addRevision(doc: SavedObjectUnsanitizedDoc<RawRule>): SavedObjectUnsanitizedDoc<RawRule> {
  return {
    ...doc,
    attributes: {
      ...doc.attributes,
      revision: isDetectionEngineAADRuleType(doc) ? (doc.attributes.params.version as number) : 0,
    },
  };
}

export const getMigrations880 = (encryptedSavedObjects: EncryptedSavedObjectsPluginSetup) =>
  createEsoMigration(
    encryptedSavedObjects,
    (doc: SavedObjectUnsanitizedDoc<RawRule>): doc is SavedObjectUnsanitizedDoc<RawRule> => true,
    pipeMigrations(addRevision)
  );
