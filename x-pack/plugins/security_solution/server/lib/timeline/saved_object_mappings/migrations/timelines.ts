/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObjectMigrationMap,
  SavedObjectSanitizedDoc,
  SavedObjectUnsanitizedDoc,
} from '@kbn/core/server';
import { SAVED_QUERY_ID_REF_NAME, SAVED_QUERY_TYPE } from '../../constants';
import { createMigratedDoc, createReference } from './utils';

export interface SavedQueryId {
  savedQueryId?: string | null;
}

export const migrateSavedQueryIdToReferences = (
  doc: SavedObjectUnsanitizedDoc<SavedQueryId>
): SavedObjectSanitizedDoc<unknown> => {
  const { savedQueryId, ...restAttributes } = doc.attributes;

  const { references: docReferences = [] } = doc;
  const savedQueryIdReferences = createReference(
    savedQueryId,
    SAVED_QUERY_ID_REF_NAME,
    SAVED_QUERY_TYPE
  );

  return createMigratedDoc({
    doc,
    attributes: restAttributes,
    docReferences,
    migratedReferences: savedQueryIdReferences,
  });
};

export const timelinesMigrations: SavedObjectMigrationMap = {
  '7.16.0': migrateSavedQueryIdToReferences,
};
