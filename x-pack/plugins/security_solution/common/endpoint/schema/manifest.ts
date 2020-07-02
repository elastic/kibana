/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { identifier, manifestSchemaVersion, manifestVersion, sha256, size, url } from './common';

export const manifestEntrySchema = t.exact(
  t.type({
    url,
    sha256,
    size,
  })
);

export const manifestSchema = t.exact(
  t.type({
    manifest_version: manifestVersion,
    schema_version: manifestSchemaVersion,
    artifacts: t.record(identifier, manifestEntrySchema),
  })
);

export type ManifestEntrySchema = t.TypeOf<typeof manifestEntrySchema>;
export type ManifestSchema = t.TypeOf<typeof manifestSchema>;
