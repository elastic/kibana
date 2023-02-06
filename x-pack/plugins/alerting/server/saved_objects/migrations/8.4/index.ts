/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectUnsanitizedDoc } from '@kbn/core-saved-objects-server';
import { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import { omit } from 'lodash';
import { RawRule } from '../../../types';
import { createEsoMigration, pipeMigrations } from '../utils';

function removeIsSnoozedUntil(
  doc: SavedObjectUnsanitizedDoc<RawRule>
): SavedObjectUnsanitizedDoc<RawRule> {
  return {
    ...doc,
    attributes: {
      ...(omit(doc.attributes, ['isSnoozedUntil']) as RawRule),
    },
  };
}

export const getMigrations841 = (encryptedSavedObjects: EncryptedSavedObjectsPluginSetup) =>
  createEsoMigration(
    encryptedSavedObjects,
    (doc: SavedObjectUnsanitizedDoc<RawRule>): doc is SavedObjectUnsanitizedDoc<RawRule> => true,
    pipeMigrations(removeIsSnoozedUntil)
  );
