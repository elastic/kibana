/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createHash } from 'crypto';

import { SavedObjectsClient } from '../../../../../../src/core/server';

import { ManifestConstants } from './common';
import { InternalManifestSchema } from './schemas';

export interface ManifestServiceOptions {
  savedObjectsClient: SavedObjectsClient;
}

export class ManifestService {

  private soClient: SavedObjectsClient;

  constructor(context: ManifestOptions) {
    this.soClient = context.savedObjectsClient;
  }

  public getManifestId(): string {
    return `endpoint-manifest-${ManifestConstants.SCHEMA_VERSION}`;
  }

  public async getManifest(): Promise<InternalManifestSchema> {
    return this.soClient.get<InternalManifestSchema>(
      ManifestConstants.SAVED_OBJECT_TYPE,
      this.getManifestId(),
    );
  }

  public async buildNewManifest(artifacts: InternalArtifactSchema[]): Promise<InternalManifestSchema> {
    // TODO: build and return a manifest from artifacts
  }

  public async dispatchAndUpdate(manifest: Manifest) {
    // TODO
    // 1. Dispatch the manifest
    // 2. Update the manifest in ES (ONLY if successful)
  }
}
