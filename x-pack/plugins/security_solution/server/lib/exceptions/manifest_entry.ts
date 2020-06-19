/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createHash } from 'crypto';

import { SavedObjectsClient, SavedObjectsPluginStart } from '../../../../../../src/core/server';

import { ListPluginSetup } from '../../../../lists/server';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ExceptionListClient } from '../../../../lists/server/services/exception_lists/exception_list_client';

import { GetFullEndpointExceptionList, CompressExceptionList } from './lists';

import { ArtifactConstants, ManifestService } from './manifest';

export class ManifestEntry {
  private exceptionListClient: ExceptionListClient;

  private os: string;
  private schemaVersion: string;

  private sha256: string;
  private size: int;

  constructor(exceptionListClient: ExceptionListClient, os: string, schemaVersion: string) {
    this.exceptionListClient = exceptionListClient;
    this.os = os;
    this.schemaVersion = schemaVersion;
  }

  public getIdentifier(): string {
    return ManifestService.getArtifactName(this.os, this.schemaVersion);
  }

  public getUrl(): string {
    return `/api/endpoint/allowlist/download/${this.getIdentifier()}/${this.sha256}`;
  }

  public getState(): object {
    // TODO: type
    return {
      identifier: this.getIdentifier(),
      url: this.getUrl(),
      sha256: this.sha256,
      size: this.size,
    };
  }

  public async refresh() {
    const exceptions = await GetFullEndpointExceptionList(
      this.exceptionListClient,
      this.os,
      this.schemaVersion
    );
    const compressedExceptions: Buffer = await CompressExceptionList(exceptions);

    const sha256Hash = createHash('sha256')
      .update(compressedExceptions.toString('utf8'), 'utf8')
      .digest('hex');

    this.sha256 = sha256Hash;
    this.size = Buffer.from(JSON.stringify(exceptions)).byteLength;

    /*
    this.savedObject = {
      name: this.getIdentifier(),
      schemaVersion: this.schemaVersion,
      sha256: sha256Hash,
      encoding: 'xz',
      created: Date.now(),
      body: compressedExceptions.toString('binary'),
      size: Buffer.from(JSON.stringify(exceptions)).byteLength,
    };
    */
  }
}
