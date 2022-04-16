/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchHit } from '@kbn/core/types/elasticsearch';

import type { Artifact, ArtifactElasticsearchProperties, NewArtifact } from './types';
import { ARTIFACT_DOWNLOAD_RELATIVE_PATH } from './constants';

export const esSearchHitToArtifact = <
  T extends Pick<SearchHit<ArtifactElasticsearchProperties>, '_id' | '_source'>
>({
  _id: id,
  _source: {
    compression_algorithm: compressionAlgorithm,
    decoded_sha256: decodedSha256,
    decoded_size: decodedSize,
    encoded_sha256: encodedSha256,
    encoded_size: encodedSize,
    encryption_algorithm: encryptionAlgorithm,
    package_name: packageName,
    ...attributesNotNeedingRename
  },
}: T): Artifact => {
  return {
    ...attributesNotNeedingRename,
    id,
    compressionAlgorithm,
    decodedSha256,
    decodedSize,
    encodedSha256,
    encodedSize,
    encryptionAlgorithm,
    packageName,
  };
};

export const newArtifactToElasticsearchProperties = ({
  encryptionAlgorithm,
  packageName,
  encodedSize,
  encodedSha256,
  decodedSize,
  decodedSha256,
  compressionAlgorithm,
  ...attributesNotNeedingRename
}: NewArtifact): ArtifactElasticsearchProperties => {
  return {
    ...attributesNotNeedingRename,
    encryption_algorithm: encryptionAlgorithm,
    package_name: packageName,
    encoded_size: encodedSize,
    encoded_sha256: encodedSha256,
    decoded_size: decodedSize,
    decoded_sha256: decodedSha256,
    compression_algorithm: compressionAlgorithm,
    created: new Date().toISOString(),
  };
};

export const relativeDownloadUrlFromArtifact = <
  T extends Pick<Artifact, 'identifier' | 'decodedSha256'>
>({
  identifier,
  decodedSha256,
}: T): string => {
  return ARTIFACT_DOWNLOAD_RELATIVE_PATH.replace('{identifier}', identifier).replace(
    '{decodedSha256}',
    decodedSha256
  );
};

export const uniqueIdFromArtifact = <
  T extends Pick<Artifact, 'identifier' | 'decodedSha256' | 'packageName'>
>({
  identifier,
  decodedSha256,
  packageName,
}: T): string => {
  return `${packageName}:${identifier}-${decodedSha256}`;
};
