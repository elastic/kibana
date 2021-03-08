/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ElasticsearchClient } from 'kibana/server';
import {
  Artifact,
  ArtifactsClientCreateOptions,
  ArtifactEncodedMetadata,
  ArtifactsClientInterface,
  NewArtifact,
} from './types';
import { ListResult } from '../../../common';
import { relativeDownloadUrlFromArtifact } from './mappings';
import { ArtifactAccessDeniedError } from './errors';
import { ListWithKuery } from '../../types';
import {
  createArtifact,
  deleteArtifact,
  encodeArtifactContent,
  generateArtifactContentHash,
  getArtifact,
  listArtifacts,
} from './artifacts';

/**
 * Exposes an interface for access artifacts from within the context of an integration (`packageName`)
 */
export class FleetArtifactsClient implements ArtifactsClientInterface {
  constructor(private esClient: ElasticsearchClient, private packageName: string) {
    if (!packageName) {
      throw new Error('packageName is required');
    }
  }

  private validate(artifact: Artifact): Artifact {
    if (artifact.packageName !== this.packageName) {
      throw new ArtifactAccessDeniedError(artifact.packageName, this.packageName);
    }

    return artifact;
  }

  async getArtifact(id: string): Promise<Artifact | undefined> {
    const artifact = await getArtifact(this.esClient, id);
    return artifact ? this.validate(artifact) : undefined;
  }

  /**
   * Creates a new artifact. Content will be compress and stored in binary form.
   */
  async createArtifact({
    content,
    type = '',
    identifier = this.packageName,
  }: ArtifactsClientCreateOptions): Promise<Artifact> {
    const encodedMetaData = await this.encodeContent(content);
    const newArtifactData: NewArtifact = {
      type,
      identifier,
      packageName: this.packageName,
      encryptionAlgorithm: 'none',
      relative_url: relativeDownloadUrlFromArtifact({
        identifier,
        decodedSha256: encodedMetaData.decodedSha256,
      }),
      ...encodedMetaData,
    };

    return createArtifact(this.esClient, newArtifactData);
  }

  async deleteArtifact(id: string) {
    // get the artifact first, which will also ensure its validated
    const artifact = await this.getArtifact(id);

    if (artifact) {
      await deleteArtifact(this.esClient, id);
    }
  }

  async listArtifacts({ kuery, ...options }: ListWithKuery): Promise<ListResult<Artifact>> {
    // All filtering for artifacts should be bound to the `packageName`, so we insert
    // that into the KQL value and use `AND` to add the defined `kuery` (if any) to it.
    const filter = `(packageName: "${this.packageName}")${kuery ? ` AND ${kuery}` : ''}`;

    return listArtifacts(this.esClient, {
      ...options,
      kuery: filter,
    });
  }

  generateHash(content: string): string {
    return generateArtifactContentHash(content);
  }

  async encodeContent(
    content: ArtifactsClientCreateOptions['content']
  ): Promise<ArtifactEncodedMetadata> {
    return encodeArtifactContent(content);
  }
}
