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

function migrateInvestigationFieldsToObject(
  doc: SavedObjectUnsanitizedDoc<RawRule>
): SavedObjectUnsanitizedDoc<RawRule> {
  if (isDetectionEngineAADRuleType(doc)) {
    const investigationFields = doc.attributes.params.investigationFields;

    if (Array.isArray(investigationFields)) {
      return {
        ...doc,
        attributes: {
          ...doc.attributes,
          params: {
            ...doc.attributes.params,
            investigationFields: {
              fieldNames: investigationFields,
            },
          },
        },
      };
    }
  }

  return doc;
}

export const getMigrations8110 = (encryptedSavedObjects: EncryptedSavedObjectsPluginSetup) =>
  createEsoMigration(
    encryptedSavedObjects,
    (doc: SavedObjectUnsanitizedDoc<RawRule>): doc is SavedObjectUnsanitizedDoc<RawRule> => true,
    pipeMigrations(migrateInvestigationFieldsToObject)
  );
