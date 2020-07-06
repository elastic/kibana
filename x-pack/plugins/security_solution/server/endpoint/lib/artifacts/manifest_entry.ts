/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InternalArtifactSchema } from '../../schemas/artifacts';
import { ManifestEntrySchema } from '../../../../common/endpoint/schema/manifest';

export class ManifestEntry {
  private artifact: InternalArtifactSchema;

  constructor(artifact: InternalArtifactSchema) {
    this.artifact = artifact;
  }

  public getDocId(): string {
    return `${this.getIdentifier()}-${this.getCompressedSha256()}`;
  }

  public getIdentifier(): string {
    return this.artifact.identifier;
  }

  public getCompressedSha256(): string {
    return this.artifact.compressedSha256;
  }

  public getDecompressedSha256(): string {
    return this.artifact.decompressedSha256;
  }

  public getCompressedSize(): number {
    return this.artifact.compressedSize;
  }

  public getDecompressedSize(): number {
    return this.artifact.decompressedSize;
  }

  public getUrl(): string {
    return `/api/endpoint/artifacts/download/${this.getIdentifier()}/${this.getCompressedSha256()}`;
  }

  public getArtifact(): InternalArtifactSchema {
    return this.artifact;
  }

  public getRecord(): ManifestEntrySchema {
    return {
      compression_algorithm: 'none',
      encryption_algorithm: 'none',
      precompress_sha256: this.getDecompressedSha256(),
      precompress_size: this.getDecompressedSize(),
      postcompress_sha256: this.getCompressedSha256(),
      postcompress_size: this.getCompressedSize(),
      relative_url: this.getUrl(),
    };
  }
}
