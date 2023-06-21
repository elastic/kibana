/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ListResult } from '../../../common/types';
import type { ListWithKuery } from '../../types';

export interface NewArtifact {
  compressionAlgorithm: 'none' | 'zlib';
  encryptionAlgorithm: 'none';
  decodedSha256: string;
  decodedSize: number;
  encodedSha256: string;
  encodedSize: number;
  /**
   * An identifier for the Artifact download. Value is used in download URL route, thus it should
   * not include spaces and it should be all lowercase. Defaults to the `packageName` if no value
   * is set during artifact creation.
   */
  identifier: string;
  /** The integration name that owns the artifact */
  packageName: string;
  /** The relative URL to download this artifact from fleet-server */
  relative_url: string;
  /** The encoded (binary) content of the artifact as BASE64 string  */
  body: string;
  type?: string;
}

export interface Artifact extends NewArtifact {
  id: string;
  created: string;
}

/**
 * The set of Properties in Artifact that are actually stored in the Artifact document defined by the schema
 */
export type ArtifactElasticsearchProperties = Pick<
  Artifact,
  'identifier' | 'body' | 'created' | 'type' | 'relative_url'
> & {
  compression_algorithm: Artifact['compressionAlgorithm'];
  encryption_algorithm: Artifact['encryptionAlgorithm'];
  encoded_sha256: Artifact['encodedSha256'];
  encoded_size: Artifact['encodedSize'];
  decoded_sha256: Artifact['decodedSha256'];
  decoded_size: Artifact['decodedSize'];
  package_name: Artifact['packageName'];
};

export type ArtifactEncodedMetadata = Pick<
  Artifact,
  | 'decodedSha256'
  | 'decodedSize'
  | 'encodedSha256'
  | 'encodedSize'
  | 'compressionAlgorithm'
  | 'body'
>;

type ArtifactUserDefinedMetadata = Pick<Artifact, 'identifier' | 'type'>;

export type ArtifactsClientCreateOptions = Partial<ArtifactUserDefinedMetadata> & {
  /** the artifact content. This value will be compressed and then stored as the `body` of the artifact */
  content: string;
};

export type ListArtifactsProps = Pick<ListWithKuery, 'perPage' | 'page' | 'kuery' | 'sortOrder'> & {
  sortField?: string | keyof ArtifactElasticsearchProperties;
};

/**
 * The interface exposed out of Fleet's Artifact service via the client class
 */
export interface ArtifactsClientInterface {
  getArtifact(id: string): Promise<Artifact | undefined>;

  createArtifact(options: ArtifactsClientCreateOptions): Promise<Artifact>;

  bulkCreateArtifacts(
    optionsList: ArtifactsClientCreateOptions[]
  ): Promise<{ artifacts?: Artifact[]; errors?: Error[] }>;

  deleteArtifact(id: string): Promise<void>;

  listArtifacts(options?: ListArtifactsProps): Promise<ListResult<Artifact>>;

  encodeContent(content: ArtifactsClientCreateOptions['content']): Promise<ArtifactEncodedMetadata>;

  generateHash(content: string): string;
}
