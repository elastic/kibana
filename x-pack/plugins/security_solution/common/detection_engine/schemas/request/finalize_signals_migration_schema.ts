/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export const finalizeSignalsMigrationSchema = t.exact(
  t.type({
    migration_ids: t.array(t.string),
  })
);

export type FinalizeSignalsMigrationSchema = t.TypeOf<typeof finalizeSignalsMigrationSchema>;
