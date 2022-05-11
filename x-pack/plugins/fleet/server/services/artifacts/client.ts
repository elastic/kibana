/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient } from '@kbn/core/server';

import type { ListResult } from '../../../common';

import { ArtifactsClientAccessDeniedError, ArtifactsClientError } from '../../errors';

import type {
  Artifact,
  ArtifactsClientCreateOptions,
  ArtifactEncodedMetadata,
  ArtifactsClientInterface,
  NewArtifact,
  ListArtifactsProps,
} from './types';
import { relativeDownloadUrlFromArtifact } from './mappings';

import {
  createArtifact,
  deleteArtifact,
  encodeArtifactContent,
  generateArtifactContentHash,
  getArtifact,
  listArtifacts,
} from './artifacts';

/**
 * Exposes an interface for access artifacts from within the context of a single integration (`packageName`)
 */
export class FleetArtifactsClient implements ArtifactsClientInterface {
  constructor(private esClient: ElasticsearchClient, private packageName: string) {
    if (!packageName) {
      throw new ArtifactsClientError('packageName is required');
    }
  }

  private validate(artifact: Artifact): Artifact {
    if (artifact.packageName !== this.packageName) {
      throw new ArtifactsClientAccessDeniedError(artifact.packageName, this.packageName);
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

  /**
   * Get a list of artifacts.
   * NOTE that when using the `kuery` filtering param, that all filters property names should
   * match the internal attribute names of the index
   */
  async listArtifacts({ kuery, ...options }: ListArtifactsProps = {}): Promise<
    ListResult<Artifact>
  > {
    // All filtering for artifacts should be bound to the `packageName`, so we insert
    // that into the KQL value and use `AND` to add the defined `kuery` (if any) to it.
    const filter = `(package_name: "${this.packageName}")${kuery ? ` AND ${kuery}` : ''}`;

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
