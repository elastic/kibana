/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
   * not include spaces and it should be all lowercase
   */
  identifier: string;
  /** The integration name that owns the artifact */
  packageName: string;
  /** The relative URL to download this artifact from fleet-server */
  relative_url: string;
  /** The encoded binary content of the artifact as BASE64 string  */
  body: string;
  created: string;
  type?: string;
}

type ArtifactUserDefinedMetadata = Pick<Artifact, 'identifier' | 'type'>;

export type ArtifactCreateOptions = ArtifactUserDefinedMetadata & {
  /** the artifact content. This value will be compressed and then stored as the `body` of the artifact */
  content: string;
};

export interface ArtifactsInterface {
  getArtifact(id: string): Promise<Artifact | undefined>;
  createArtifact(options: ArtifactCreateOptions): Promise<Artifact>;
  deleteArtifact(id: string): Promise<void>;
}
