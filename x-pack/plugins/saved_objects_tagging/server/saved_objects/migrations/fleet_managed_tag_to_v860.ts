/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectMigrationFn } from '@kbn/core/server';
import { TagAttributes } from '../../../common';

export const migrateFleetManagedTagToV860: SavedObjectMigrationFn<TagAttributes, TagAttributes> = (
  tagDoc,
  migrationContext
) => {
  if (tagDoc.id !== 'managed' || !tagDoc?.namespaces?.length) return tagDoc;

  const namespace = tagDoc.namespaces[0];

  tagDoc.id = `${namespace}-managed`;
  return tagDoc;
};
