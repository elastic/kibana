/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { Artifact } from '@kbn/fleet-plugin/server';
import { APM_SOURCE_MAP_INDEX } from '../settings/apm_indices/get_apm_indices';

function getBodyFromArtifact(artifact: Artifact) {
  return {
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
}

export function createSourceMapDoc(
  artifact: Artifact,
  internalESClient: ElasticsearchClient
) {
  const body = getBodyFromArtifact(artifact);
  const params: estypes.IndexRequest = {
    index: APM_SOURCE_MAP_INDEX,
    id: artifact.id, // overwrite existing source map if it exists
    body,
  };

  return internalESClient.index(params);
}

export function bulkCreateSourceMapDocs(
  artifacts: Artifact[],
  internalESClient: ElasticsearchClient
) {
  const params: estypes.BulkRequest = {
    body: artifacts.flatMap((artifact) => {
      return [
        { index: { _index: APM_SOURCE_MAP_INDEX, _id: artifact.id } },
        getBodyFromArtifact(artifact),
      ];
    }),
  };

  return internalESClient.bulk(params);
}
