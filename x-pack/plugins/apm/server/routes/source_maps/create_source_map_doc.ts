/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Artifact } from '@kbn/fleet-plugin/server';
import {
  APMIndexDocumentParams,
  APMInternalESClient,
} from '../../lib/helpers/create_es_client/create_internal_es_client';

export function createSourceMapDoc(
  artifact: Artifact,
  internalESClient: APMInternalESClient
) {
  const sourceMapArtifact = {
    type: artifact.type,
    identifier: artifact.identifier,
    relative_url: artifact.relative_url,
    body: artifact.body,
    encryption_algorithm: artifact.encryptionAlgorithm,
    package_name: artifact.packageName,
    encoded_size: artifact.encodedSize,
    encoded_sha256: artifact.encodedSha256,
    decoded_size: artifact.decodedSize,
    decoded_sha256: artifact.decodedSha256,
    compression_algorithm: artifact.compressionAlgorithm,
    created: artifact.created,
  };

  const params: APMIndexDocumentParams<unknown> = {
    index: internalESClient.apmIndices.apmSourceMapIndex,
    id: artifact.id, // overwrite existing source map if it exists
    body: sourceMapArtifact,
  };

  return internalESClient.index('upsert_source_map', params);
}
