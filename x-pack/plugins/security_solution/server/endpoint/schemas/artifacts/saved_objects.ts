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
  semanticVersion,
  sha256,
  size,
  manifestSchemaVersion,
} from '../../../../common/endpoint/schema/common';
import { created } from './common';

export const body = t.string; // base64

export const internalArtifactRecordSchema = t.exact(
  t.type({
    identifier,
    compressionAlgorithm,
    encryptionAlgorithm,
    decodedSha256: sha256,
    decodedSize: size,
    encodedSha256: sha256,
    encodedSize: size,
  })
);
export type InternalArtifactRecordSchema = t.TypeOf<typeof internalArtifactRecordSchema>;

export const internalArtifactAdditionalFields = {
  body,
};

export const internalArtifactSchema = t.intersection([
  internalArtifactRecordSchema,
  t.partial(internalArtifactAdditionalFields),
]);
export type InternalArtifactSchema = t.TypeOf<typeof internalArtifactSchema>;

export const internalArtifactCompleteSchema = t.intersection([
  internalArtifactRecordSchema,
  t.exact(t.type(internalArtifactAdditionalFields)),
]);
export type InternalArtifactCompleteSchema = t.TypeOf<typeof internalArtifactCompleteSchema>;

export const internalArtifactCreateSchema = t.intersection([
  internalArtifactCompleteSchema,
  t.exact(
    t.type({
      created,
    })
  ),
]);
export type InternalArtifactCreateSchema = t.TypeOf<typeof internalArtifactCreateSchema>;

export const internalManifestSchema = t.exact(
  t.type({
    ids: t.array(identifier),
    schemaVersion: manifestSchemaVersion,
    semanticVersion,
  })
);
export type InternalManifestSchema = t.TypeOf<typeof internalManifestSchema>;

export const internalManifestCreateSchema = t.intersection([
  internalManifestSchema,
  t.exact(
    t.type({
      created,
    })
  ),
]);
export type InternalManifestCreateSchema = t.TypeOf<typeof internalManifestCreateSchema>;
