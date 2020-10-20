/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectMigrationMap } from '../../../../../src/core/server';

export const migrations: SavedObjectMigrationMap = {
  '7.9.0': (doc) => doc,
  '7.10.0': (doc) => doc,
};
