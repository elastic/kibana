/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

import { NonEmptyString } from '../types';

const migrationToken = NonEmptyString;

export const finalizeSignalsMigrationSchema = t.exact(
  t.type({
    migration_token: migrationToken,
  })
);

export type FinalizeSignalsMigrationSchema = t.TypeOf<typeof finalizeSignalsMigrationSchema>;
