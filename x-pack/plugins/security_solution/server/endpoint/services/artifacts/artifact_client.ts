/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InternalArtifactCompleteSchema } from '../../schemas/artifacts';
import {
  Artifact,
  ArtifactsClientInterface,
  ListArtifactsProps,
} from '../../../../../fleet/server';
import { ListResult } from '../../../../../fleet/common';

export interface EndpointArtifactClientInterface {
  getArtifact(id: string): Promise<InternalArtifactCompleteSchema | undefined>;

  createArtifact(artifact: InternalArtifactCompleteSchema): Promise<InternalArtifactCompleteSchema>;

  deleteArtifact(id: string): Promise<void>;

  listArtifacts(options?: ListArtifactsProps): Promise<ListResult<Artifact>>;
}

/**
 * Endpoint specific artifact management client which uses FleetArtifactsClient to persist artifacts
 * to the Fleet artifacts index (then used by Fleet Server)
 */
export class EndpointArtifactClient implements EndpointArtifactClientInterface {
  constructor(private fleetArtifacts: ArtifactsClientInterface) {}

  private parseArtifactId(
    id: string
  ): Pick<Artifact, 'decodedSha256' | 'identifier'> & { type: string } {
    const idPieces = id.split('-');

    return {
      type: idPieces[1],
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      decodedSha256: idPieces.pop()!,
      identifier: idPieces.join('-'),
    };
  }

  async getArtifact(id: string) {
    const { decodedSha256, identifier } = this.parseArtifactId(id);
    const artifacts = await this.fleetArtifacts.listArtifacts({
      kuery: `decoded_sha256: "${decodedSha256}" AND identifier: "${identifier}"`,
      perPage: 1,
    });

    if (artifacts.items.length === 0) {
      return;
    }

    return artifacts.items[0];
  }

  async listArtifacts(options?: ListArtifactsProps): Promise<ListResult<Artifact>> {
    return this.fleetArtifacts.listArtifacts(options);
  }

  async createArtifact(
    artifact: InternalArtifactCompleteSchema
  ): Promise<InternalArtifactCompleteSchema> {
    const createdArtifact = await this.fleetArtifacts.createArtifact({
      content: Buffer.from(artifact.body, 'base64').toString(),
      identifier: artifact.identifier,
      type: this.parseArtifactId(artifact.identifier).type,
    });

    return createdArtifact;
  }

  async deleteArtifact(id: string) {
    // Ignoring the `id` not being in the type until we can refactor the types in endpoint.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const artifactId = (await this.getArtifact(id))?.id!;
    return this.fleetArtifacts.deleteArtifact(artifactId);
  }
}
