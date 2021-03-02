/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ElasticsearchClient } from 'kibana/server';
import { Artifact, ArtifactsInterface } from './types';
import { FLEET_SERVER_ARTIFACTS_INDEX } from '../../../common';
import { ESSearchHit } from '../../../../../typings/elasticsearch';
import { esSearchHitToArtifact } from './mappings';
import { ArtifactAccessDeniedError } from './errors';

export class FleetArtifactsClient implements ArtifactsInterface {
  constructor(private esClient: ElasticsearchClient, private packageName: string) {}

  private validate(artifact: Artifact): Artifact {
    if (artifact.packageName !== this.packageName) {
      throw new ArtifactAccessDeniedError(
        `Access denied. Artifact package name (${artifact.packageName}) does not match ${this.packageName}`
      );
    }

    return artifact;
  }

  async getArtifact(id: string): Promise<Artifact | undefined> {
    const esData = await this.esClient.get<ESSearchHit<Artifact>>({
      index: FLEET_SERVER_ARTIFACTS_INDEX,
      id,
    });
    const response = esSearchHitToArtifact(esData.body);
    return this.validate(response);
  }

  /**
   * Creates a new artifact. Content will be compress and stored in binary form.
   * @param content
   */
  async createArtifact(content: string): Promise<Artifact> {
    // REMINDER: catch failures
  }

  async deleteArtifact(id: string) {
    // get the artifact first, which will also ensure its validated
    const artifact = await this.getArtifact(id);

    if (artifact) {
      await this.esClient.delete({
        index: FLEET_SERVER_ARTIFACTS_INDEX,
        id,
      });
    }
  }
}
