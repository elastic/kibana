/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ListResult } from '../../../common';
import { ListWithKuery } from '../../types';

export interface Artifact {
  id: string;
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
  created: string;
  type?: string;
}

/**
 * The set of Properties in Artifact that are actually stored in the Artifact document defined by the schema
 */
export type ArtifactElasticsearchProperties = Omit<Artifact, 'id'>;

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

export type ArtifactCreateOptions = Partial<ArtifactUserDefinedMetadata> & {
  /** the artifact content. This value will be compressed and then stored as the `body` of the artifact */
  content: string;
};

export interface ArtifactsInterface {
  getArtifact(id: string): Promise<Artifact | undefined>;
  createArtifact(options: ArtifactCreateOptions): Promise<Artifact>;
  deleteArtifact(id: string): Promise<void>;
  listArtifacts(options?: ListWithKuery): Promise<ListResult<Artifact>>;
  encodeContent(content: ArtifactCreateOptions['content']): Promise<ArtifactEncodedMetadata>;
  generateHash(content: string): string;
}
