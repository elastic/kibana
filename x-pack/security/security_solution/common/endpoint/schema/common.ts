/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export const compressionAlgorithm = t.keyof({
  none: null,
  zlib: null,
});
export type CompressionAlgorithm = t.TypeOf<typeof compressionAlgorithm>;

export const compressionAlgorithmDispatch = t.keyof({
  zlib: null,
  none: null,
});

export const encryptionAlgorithm = t.keyof({
  none: null,
});

export const identifier = t.string;

export const manifestSchemaVersion = t.keyof({
  v1: null,
});
export type ManifestSchemaVersion = t.TypeOf<typeof manifestSchemaVersion>;

export const relativeUrl = t.string;

export const sha256 = t.string;

export const semanticVersion = t.string;
export type SemanticVersion = t.TypeOf<typeof semanticVersion>;

export const size = t.number;
