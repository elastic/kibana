/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObject,
  SavedObjectsClientContract,
  SavedObjectsUpdateResponse,
} from '@kbn/core/server';
import { validate } from '@kbn/securitysolution-io-ts-utils';
import {
  manifestSchemaVersion,
  ManifestSchemaVersion,
} from '../../../../common/endpoint/schema/common';
import { ManifestConstants } from '../../lib/artifacts';
import { InternalManifestSchema, InternalManifestCreateSchema } from '../../schemas/artifacts';

interface UpdateManifestOpts {
  version: string;
}

export class ManifestClient {
  private schemaVersion: ManifestSchemaVersion;
  private savedObjectsClient: SavedObjectsClientContract;

  constructor(
    savedObjectsClient: SavedObjectsClientContract,
    schemaVersion: ManifestSchemaVersion
  ) {
    this.savedObjectsClient = savedObjectsClient;

    const [validated, errors] = validate(schemaVersion as unknown as object, manifestSchemaVersion);

    if (errors != null || validated === null) {
      throw new Error(`Invalid manifest version: ${schemaVersion}`);
    }

    this.schemaVersion = validated;
  }

  public getManifestId(): string {
    return `endpoint-manifest-${this.schemaVersion}`;
  }

  public async getManifest(): Promise<SavedObject<InternalManifestSchema>> {
    return this.savedObjectsClient.get<InternalManifestSchema>(
      ManifestConstants.SAVED_OBJECT_TYPE,
      this.getManifestId()
    );
  }

  public async createManifest(
    manifest: InternalManifestSchema
  ): Promise<SavedObject<InternalManifestSchema>> {
    return this.savedObjectsClient.create<InternalManifestCreateSchema>(
      ManifestConstants.SAVED_OBJECT_TYPE,
      {
        ...manifest,
        created: Date.now(),
      },
      { id: this.getManifestId() }
    );
  }

  public async updateManifest(
    manifest: InternalManifestSchema,
    opts?: UpdateManifestOpts
  ): Promise<SavedObjectsUpdateResponse<InternalManifestSchema>> {
    return this.savedObjectsClient.update<InternalManifestSchema>(
      ManifestConstants.SAVED_OBJECT_TYPE,
      this.getManifestId(),
      manifest,
      opts
    );
  }

  public async deleteManifest() {
    return this.savedObjectsClient.delete(
      ManifestConstants.SAVED_OBJECT_TYPE,
      this.getManifestId()
    );
  }
}
