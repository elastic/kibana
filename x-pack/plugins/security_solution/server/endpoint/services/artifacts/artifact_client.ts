/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import { inflate as _inflate } from 'zlib';
import { promisify } from 'util';
import { SavedObject, SavedObjectsClientContract } from 'src/core/server';
import { ArtifactConstants, getArtifactId } from '../../lib/artifacts';
import {
  InternalArtifactCompleteSchema,
  InternalArtifactCreateSchema,
} from '../../schemas/artifacts';
import { Artifact, ArtifactsInterface } from '../../../../../fleet/server';

const inflateAsync = promisify(_inflate);

export interface EndpointArtifactClientInterface {
  getArtifact(id: string): Promise<SavedObject<InternalArtifactCompleteSchema>>;
  createArtifact(
    artifact: InternalArtifactCompleteSchema
  ): Promise<SavedObject<InternalArtifactCompleteSchema>>;
  deleteArtifact(id: string): Promise<void>;
}

export class ArtifactClient implements EndpointArtifactClientInterface {
  private savedObjectsClient: SavedObjectsClientContract;

  constructor(savedObjectsClient: SavedObjectsClientContract) {
    this.savedObjectsClient = savedObjectsClient;
  }

  public async getArtifact(id: string): Promise<SavedObject<InternalArtifactCompleteSchema>> {
    return this.savedObjectsClient.get<InternalArtifactCompleteSchema>(
      ArtifactConstants.SAVED_OBJECT_TYPE,
      id
    );
  }

  public async createArtifact(
    artifact: InternalArtifactCompleteSchema
  ): Promise<SavedObject<InternalArtifactCompleteSchema>> {
    return this.savedObjectsClient.create<InternalArtifactCreateSchema>(
      ArtifactConstants.SAVED_OBJECT_TYPE,
      {
        ...artifact,
        created: Date.now(),
      },
      { id: getArtifactId(artifact) }
    );
  }

  public async deleteArtifact(id: string) {
    await this.savedObjectsClient.delete(ArtifactConstants.SAVED_OBJECT_TYPE, id);
  }
}

/**
 * Endpoint specific artifact managment client which uses FleetArtifactsClient to persist artifacts
 * to the Fleet artifacts index (then used by Fleet Server)
 */
export class EndpointArtifactClient implements EndpointArtifactClientInterface {
  constructor(private fleetArtifacts: ArtifactsInterface) {}

  private parseArtifactId(
    id: string
  ): Pick<Artifact, 'decodedSha256' | 'identifier'> & { type: string } {
    const idPieces = id.split('-');

    return {
      type: idPieces[1],
      decodedSha256: idPieces.pop()!,
      identifier: idPieces.join('-'),
    };
  }

  async getArtifact(id: string) {
    const { decodedSha256, identifier } = this.parseArtifactId(id);
    const artifacts = await this.fleetArtifacts.listArtifacts({
      kuery: `decodedSha256: "${decodedSha256}" AND identifier: "${identifier}"`,
      perPage: 1,
    });

    // FIXME:PT change method signature so that it returns back only the `InternalArtifactCompleteSchema`
    return ({
      attributes: artifacts.items[0],
    } as unknown) as SavedObject<InternalArtifactCompleteSchema>;
  }

  async createArtifact(
    artifact: InternalArtifactCompleteSchema
  ): Promise<SavedObject<InternalArtifactCompleteSchema>> {
    // FIXME:PT refactor to make this more efficient by passing through the uncompressed artifact content
    // Artifact `.body` is compressed/encoded. We need it decoded and as a string
    const artifactContent = await inflateAsync(Buffer.from(artifact.body, 'base64'));

    const createdArtifact = await this.fleetArtifacts.createArtifact({
      content: artifactContent.toString(),
      identifier: artifact.identifier,
      type: this.parseArtifactId(artifact.identifier).type,
    });

    return ({
      attributes: createdArtifact,
    } as unknown) as SavedObject<InternalArtifactCompleteSchema>;
  }

  async deleteArtifact(id: string) {
    // Ignoring the `id` not being in the type until we can refactor the types in endpoint.
    // @ts-ignore
    const artifactId = (await this.getArtifact(id)).attributes?.id;
    return this.fleetArtifacts.deleteArtifact(artifactId);
  }
}
