/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectMigrationMap } from '@kbn/core/server';

export const migrations: SavedObjectMigrationMap = {
  '7.9.0': (doc) => doc,
  '7.10.0': (doc) => doc,
};
