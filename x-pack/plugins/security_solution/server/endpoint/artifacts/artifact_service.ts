/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createHash } from 'crypto';

import { SavedObjectsClient } from '../../../../../../src/core/server';
import { ExceptionListClient } from '../../../../lists/server';

import { ArtifactConstants } from './common';
import { CompressExceptionList, GetFullEndpointExceptionList } from './lists';
import { InternalArtifactSchema } from './schemas';

export interface ArtifactServiceOptions {
  savedObjectsClient: SavedObjectsClient;
}

export class ArtifactService {

  private soClient: SavedObjectsClient;
  private exceptionListClient: ExceptionListClient;

  constructor(context: ManifestOptions) {
    this.soClient = context.savedObjectsClient;
    this.exceptionListClient = context.exceptionListClient;
  }

  public async buildExceptionListArtifacts(): Promise<Array<InternalArtifactSchema>> {
    const artifacts: InternalArtifactSchema = [];

    for (const os of ArtifactConstants.SUPPORTED_OPERATING_SYSTEMS) {
      for (const schemaVersion of ArtifactConstants.SUPPORTED_SCHEMA_VERSIONS) {
        const exceptions = await GetFullEndpointExceptionList(
          this.exceptionListClient,
          os,
          schemaVersion,
        );

        const compressedExceptions: Buffer = await CompressExceptionList(exceptions);

        const sha256 = createHash('sha256')
          .update(compressedExceptions.toString('utf8'), 'utf8')
          .digest('hex');

        artifacts.push({
          identifier: this.getIdentifier(),
          sha256,
          encoding: 'xz',
          created: Date.now(),
          body: compressedExceptions.toString('binary'),
          size: Buffer.from(JSON.stringify(exceptions)).byteLength,
        });
      }
    }

    return artifacts;
  }

  public async upsertArtifact(artifact: InternalArtifactSchema) {
    // TODO
  }
}
