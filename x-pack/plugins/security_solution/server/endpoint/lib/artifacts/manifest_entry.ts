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
    return `${this.getIdentifier()}-${this.getSha256()}`;
  }

  public getIdentifier(): string {
    return this.artifact.identifier;
  }

  public getSha256(): string {
    return this.artifact.sha256;
  }

  public getSize(): number {
    return this.artifact.size;
  }

  public getUrl(): string {
    return `/api/endpoint/artifacts/download/${this.getIdentifier()}/${this.getSha256()}`;
  }

  public getArtifact(): InternalArtifactSchema {
    return this.artifact;
  }

  public getRecord(): ManifestEntrySchema {
    return {
      sha256: this.getSha256(),
      size: this.getSize(),
      url: this.getUrl(),
    };
  }
}
