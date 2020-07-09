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
  sha256,
  size,
} from '../../../../common/endpoint/schema/common';
import { created } from './common';

export const body = t.string; // base64

export const internalArtifactSchema = t.exact(
  t.type({
    identifier,
    compressionAlgorithm,
    encryptionAlgorithm,
    decodedSha256: sha256,
    decodedSize: size,
    encodedSha256: sha256,
    encodedSize: size,
    created,
    body,
  })
);

export type InternalArtifactSchema = t.TypeOf<typeof internalArtifactSchema>;

export const internalManifestSchema = t.exact(
  t.type({
    created,
    ids: t.array(identifier),
  })
);

export type InternalManifestSchema = t.TypeOf<typeof internalManifestSchema>;
