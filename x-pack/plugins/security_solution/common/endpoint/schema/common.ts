/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

export const compressionAlgorithm = t.keyof({
  none: null,
  zlib: null,
});

export const encryptionAlgorithm = t.keyof({
  none: null,
});

export const identifier = t.string;

export const manifestVersion = t.string;

export const manifestSchemaVersion = t.keyof({
  '1.0.0': null,
});
export type ManifestSchemaVersion = t.TypeOf<typeof manifestSchemaVersion>;

export const relativeUrl = t.string;

export const sha256 = t.string;

export const size = t.number;
