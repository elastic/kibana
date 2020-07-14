/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import {
  compressionAlgorithm,
  encryptionAlgorithm,
  identifier,
  manifestSchemaVersion,
  manifestVersion,
  relativeUrl,
  sha256,
  size,
} from './common';

export const manifestEntrySchema = t.exact(
  t.type({
    relative_url: relativeUrl,
    decoded_sha256: sha256,
    decoded_size: size,
    encoded_sha256: sha256,
    encoded_size: size,
    compression_algorithm: compressionAlgorithm,
    encryption_algorithm: encryptionAlgorithm,
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
