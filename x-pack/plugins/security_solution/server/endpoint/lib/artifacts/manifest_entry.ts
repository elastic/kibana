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
    return `${this.getIdentifier()}-${this.getEncodedSha256()}`;
  }

  public getIdentifier(): string {
    return this.artifact.identifier;
  }

  public getEncodedSha256(): string {
    return this.artifact.encodedSha256;
  }

  public getDecodedSha256(): string {
    return this.artifact.decodedSha256;
  }

  public getEncodedSize(): number {
    return this.artifact.encodedSize;
  }

  public getDecodedSize(): number {
    return this.artifact.decodedSize;
  }

  public getUrl(): string {
    return `/api/endpoint/artifacts/download/${this.getIdentifier()}/${this.getEncodedSha256()}`;
  }

  public getArtifact(): InternalArtifactSchema {
    return this.artifact;
  }

  public getRecord(): ManifestEntrySchema {
    return {
      compression_algorithm: 'none',
      encryption_algorithm: 'none',
      decoded_sha256: this.getDecodedSha256(),
      decoded_size: this.getDecodedSize(),
      encoded_sha256: this.getEncodedSha256(),
      encoded_size: this.getEncodedSize(),
      relative_url: this.getUrl(),
    };
  }
}
