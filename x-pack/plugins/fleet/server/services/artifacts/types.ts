/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface Artifact {
  id: string;
  /**
   * An identifier for the Artifact download. Value is used in download URL route, thus it should
   * not include spaces and it should be all lowercase
   */
  identifier: string;
  compressionAlgorithm: 'none' | 'zlib';
  encryptionAlgorithm: 'none';
  decodedSha256: string;
  decodedSize: number;
  encodedSha256: string;
  encodedSize: number;
  packageName: string;
  /** The relative URL to download this artifact from fleet-server */
  relative_url: string;
  created: string;
  type?: string;
}

type ArtifactUserDefinedMetadata = Pick<Artifact, 'identifier' | 'type'>;

export interface ArtifactsInterface {
  getArtifact(id: string): Promise<Artifact | undefined>;
  createArtifact(body: string, meta?: ArtifactUserDefinedMetadata): Promise<Artifact>;
  deleteArtifact(id: string): Promise<void>;
}
