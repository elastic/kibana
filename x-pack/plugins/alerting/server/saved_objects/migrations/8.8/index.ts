/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectUnsanitizedDoc } from '@kbn/core-saved-objects-server';
import { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import { v4 as uuidv4 } from 'uuid';
import { createEsoMigration, pipeMigrations } from '../utils';
import { RawRule } from '../../../types';

function addActionUuid(
  doc: SavedObjectUnsanitizedDoc<RawRule>
): SavedObjectUnsanitizedDoc<RawRule> {
  const {
    attributes: { actions },
  } = doc;

  return {
    ...doc,
    attributes: {
      ...doc.attributes,
      actions: actions
        ? actions.map((action) => ({
            ...action,
            uuid: uuidv4(),
          }))
        : [],
    },
  };
}

export const getMigrations880 = (encryptedSavedObjects: EncryptedSavedObjectsPluginSetup) =>
  createEsoMigration(
    encryptedSavedObjects,
    (doc: SavedObjectUnsanitizedDoc<RawRule>): doc is SavedObjectUnsanitizedDoc<RawRule> => true,
    pipeMigrations(addActionUuid)
  );
