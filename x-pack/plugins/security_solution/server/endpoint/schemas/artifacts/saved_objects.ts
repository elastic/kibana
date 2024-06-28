/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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

export const internalManifestEntrySchema = t.exact(
  t.type({
    policyId: t.union([identifier, t.undefined]),
    artifactId: identifier,
  })
);
export type InternalManifestEntrySchema = t.TypeOf<typeof internalManifestEntrySchema>;

export const internalManifestSchema = t.exact(
  t.type({
    artifacts: t.array(internalManifestEntrySchema),
    schemaVersion: manifestSchemaVersion,
    semanticVersion,
  })
);

/**
 * The Internal map of all artifacts that the ManifestManager knows about and is managing
 */
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

/**
 * Unified Manifest
 */

const internalUnifiedManifestBaseSchema = t.exact(
  t.type({
    artifactIds: t.array(identifier),
    policyId: identifier,
    semanticVersion,
  })
);
export type InternalUnifiedManifestBaseSchema = t.TypeOf<typeof internalUnifiedManifestBaseSchema>;

const internalUnifiedManifestUpdateSchema = t.intersection([
  internalUnifiedManifestBaseSchema,
  t.exact(
    t.type({
      id: identifier,
    })
  ),
]);
export type InternalUnifiedManifestUpdateSchema = t.TypeOf<
  typeof internalUnifiedManifestUpdateSchema
>;

export const internalUnifiedManifestSchema = t.intersection([
  internalUnifiedManifestBaseSchema,
  t.exact(
    t.type({
      id: identifier,
      created: t.union([t.string, t.undefined]),
      version: t.union([t.string, t.undefined]),
    })
  ),
]);

export type InternalUnifiedManifestSchema = t.TypeOf<typeof internalUnifiedManifestSchema>;
