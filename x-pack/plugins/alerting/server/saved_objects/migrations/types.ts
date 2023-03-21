/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogMeta, SavedObjectMigrationContext, SavedObjectUnsanitizedDoc } from '@kbn/core/server';
import { RawRule } from '../../types';

export interface AlertLogMeta extends LogMeta {
  migrations: { alertDocument: SavedObjectUnsanitizedDoc<RawRule> };
}

export type AlertMigration = (
  doc: SavedObjectUnsanitizedDoc<RawRule>,
  context: SavedObjectMigrationContext
) => SavedObjectUnsanitizedDoc<RawRule>;
