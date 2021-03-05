/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createHash } from 'crypto';
import { deflate } from 'zlib';
import { promisify } from 'util';
import { ElasticsearchClient } from 'kibana/server';
import uuid from 'uuid';
import {
  Artifact,
  ArtifactCreateOptions,
  ArtifactElasticsearchProperties,
  ArtifactEncodedMetadata,
  ArtifactsInterface,
} from './types';
import { FLEET_SERVER_ARTIFACTS_INDEX, ListResult } from '../../../common';
import { ESSearchHit, ESSearchResponse } from '../../../../../typings/elasticsearch';
import {
  esSearchHitToArtifact,
  kueryToArtifactsElasticsearchQuery,
  relativeDownloadUrlFromArtifact,
} from './mappings';
import { ArtifactAccessDeniedError, ArtifactsElasticsearchError } from './errors';
import { ListWithKuery } from '../../types';
import { isElasticsearchItemNotFoundError } from './utils';

const deflateAsync = promisify(deflate);

export class FleetArtifactsClient implements ArtifactsInterface {
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
    try {
      const esData = await this.esClient.get<ESSearchHit<ArtifactElasticsearchProperties>>({
        index: FLEET_SERVER_ARTIFACTS_INDEX,
        id,
      });

      const response = esSearchHitToArtifact(esData.body);
      return this.validate(response);
    } catch (e) {
      if (isElasticsearchItemNotFoundError(e)) {
        return;
      }

      throw new ArtifactsElasticsearchError(e);
    }
  }

  /**
   * Creates a new artifact. Content will be compress and stored in binary form.
   */
  async createArtifact({
    content,
    type = '',
    identifier = this.packageName,
  }: ArtifactCreateOptions): Promise<Artifact> {
    const encodedMetaData = await this.encodeContent(content);
    const id = uuid.v4();
    const newArtifactData: ArtifactElasticsearchProperties = {
      type,
      identifier,
      packageName: this.packageName,
      created: new Date().toISOString(),
      encryptionAlgorithm: 'none',
      relative_url: relativeDownloadUrlFromArtifact({
        identifier,
        decodedSha256: encodedMetaData.decodedSha256,
      }),
      ...encodedMetaData,
    };

    try {
      await this.esClient.create({
        index: FLEET_SERVER_ARTIFACTS_INDEX,
        id,
        body: newArtifactData,
        refresh: 'wait_for',
      });

      return {
        ...newArtifactData,
        id,
      };
    } catch (e) {
      throw new ArtifactsElasticsearchError(e);
    }
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

  async listArtifacts(options: ListWithKuery): Promise<ListResult<Artifact>> {
    const {
      perPage = 20,
      page = 1,
      kuery = '',
      sortField = 'created',
      sortOrder = 'asc',
    } = options;

    try {
      const searchResult = await this.esClient.search<
        ESSearchResponse<ArtifactElasticsearchProperties, {}>
      >({
        index: FLEET_SERVER_ARTIFACTS_INDEX,
        body: {
          query: {
            ...kueryToArtifactsElasticsearchQuery(this.packageName, kuery),
          },
          sort: [{ [sortField]: sortOrder }],
        },
        from: (page - 1) * perPage,
        size: perPage,
      });

      return {
        items: searchResult.body.hits.hits.map((hit) => esSearchHitToArtifact(hit)),
        page,
        perPage,
        total: searchResult.body.hits.total.value,
      };
    } catch (e) {
      throw new ArtifactsElasticsearchError(e);
    }
  }

  generateHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  async encodeContent(content: ArtifactCreateOptions['content']): Promise<ArtifactEncodedMetadata> {
    const decodedContentBuffer = Buffer.from(content);
    const encodedContentButter = await deflateAsync(decodedContentBuffer);

    const encodedArtifact: ArtifactEncodedMetadata = {
      compressionAlgorithm: 'zlib',
      decodedSha256: this.generateHash(decodedContentBuffer.toString()),
      decodedSize: decodedContentBuffer.byteLength,
      encodedSha256: this.generateHash(encodedContentButter.toString()),
      encodedSize: encodedContentButter.byteLength,
      body: encodedContentButter.toString('base64'),
    };

    return encodedArtifact;
  }
}
