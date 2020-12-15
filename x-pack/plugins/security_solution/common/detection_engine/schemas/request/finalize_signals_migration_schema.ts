/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

export const finalizeSignalsMigrationSchema = t.exact(
  t.type({
    migration_ids: t.array(t.string),
  })
);

export type FinalizeSignalsMigrationSchema = t.TypeOf<typeof finalizeSignalsMigrationSchema>;
