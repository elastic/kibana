/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { artifactName, manifestSchemaVersion, manifestVersion, sha256, size, url } from './common';

export const manifestSchema = t.exact(
  t.type({
    manifestVersion,
    manifestSchemaVersion,
    artifacts: t.record(artifactName, manifestEntrySchema),
  })
);

export const manifestEntrySchema = t.exact(
  t.type({
    url,
    sha256,
    size,
  })
);

export type ManifestEntrySchema = t.TypeOf<typeof manifestEntrySchema>;
export type ManifestSchema = t.TypeOf<typeof manifestSchema>;
