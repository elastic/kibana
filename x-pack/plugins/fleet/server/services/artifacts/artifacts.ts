/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';
import { deflate } from 'zlib';
import { promisify } from 'util';
import uuid from 'uuid';
import { createHash } from 'crypto';
import {
  Artifact,
  ArtifactElasticsearchProperties,
  ArtifactEncodedMetadata,
  ArtifactsClientCreateOptions,
  ListArtifactsProps,
  NewArtifact,
} from './types';
import { FLEET_SERVER_ARTIFACTS_INDEX, ListResult } from '../../../common';
import { ESSearchHit, ESSearchResponse } from '../../../../../typings/elasticsearch';
import { esSearchHitToArtifact } from './mappings';
import { isElasticsearchItemNotFoundError } from './utils';
import { ArtifactsElasticsearchError } from './errors';

const deflateAsync = promisify(deflate);

export const getArtifact = async (
  esClient: ElasticsearchClient,
  id: string
): Promise<Artifact | undefined> => {
  try {
    const esData = await esClient.get<ESSearchHit<ArtifactElasticsearchProperties>>({
      index: FLEET_SERVER_ARTIFACTS_INDEX,
      id,
    });

    return esSearchHitToArtifact(esData.body);
  } catch (e) {
    if (isElasticsearchItemNotFoundError(e)) {
      return;
    }

    throw new ArtifactsElasticsearchError(e);
  }
};

export const createArtifact = async (
  esClient: ElasticsearchClient,
  artifact: NewArtifact
): Promise<Artifact> => {
  const id = uuid.v4();
  const newArtifactData: ArtifactElasticsearchProperties = {
    ...artifact,
    created: new Date().toISOString(),
  };

  try {
    await esClient.create({
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
};

export const deleteArtifact = async (esClient: ElasticsearchClient, id: string): Promise<void> => {
  try {
    await esClient.delete({
      index: FLEET_SERVER_ARTIFACTS_INDEX,
      id,
    });
  } catch (e) {
    throw new ArtifactsElasticsearchError(e);
  }
};

export const listArtifacts = async (
  esClient: ElasticsearchClient,
  options: ListArtifactsProps = {}
): Promise<ListResult<Artifact>> => {
  const { perPage = 20, page = 1, kuery = '', sortField = 'created', sortOrder = 'asc' } = options;

  try {
    const searchResult = await esClient.search<
      ESSearchResponse<ArtifactElasticsearchProperties, {}>
    >({
      index: FLEET_SERVER_ARTIFACTS_INDEX,
      sort: `${sortField}:${sortOrder}`,
      q: kuery,
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
};

export const generateArtifactContentHash = (content: string): string => {
  return createHash('sha256').update(content).digest('hex');
};

export const encodeArtifactContent = async (
  content: ArtifactsClientCreateOptions['content']
): Promise<ArtifactEncodedMetadata> => {
  const decodedContentBuffer = Buffer.from(content);
  const encodedContentButter = await deflateAsync(decodedContentBuffer);

  const encodedArtifact: ArtifactEncodedMetadata = {
    compressionAlgorithm: 'zlib',
    decodedSha256: generateArtifactContentHash(decodedContentBuffer.toString()),
    decodedSize: decodedContentBuffer.byteLength,
    encodedSha256: generateArtifactContentHash(encodedContentButter.toString()),
    encodedSize: encodedContentButter.byteLength,
    body: encodedContentButter.toString('base64'),
  };

  return encodedArtifact;
};
