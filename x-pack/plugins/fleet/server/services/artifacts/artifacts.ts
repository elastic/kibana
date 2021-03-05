/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';
import uuid from 'uuid';
import { Artifact, ArtifactElasticsearchProperties, NewArtifact } from './types';
import { FLEET_SERVER_ARTIFACTS_INDEX, ListResult } from '../../../common';
import { ESSearchHit } from '../../../../../typings/elasticsearch';
import { esSearchHitToArtifact } from './mappings';
import { isElasticsearchItemNotFoundError } from './utils';
import { ArtifactsElasticsearchError } from './errors';

export const getArtifact = async (
  esClient: ElasticsearchClient,
  id: string
): Promise<Artifact | undefined> => {
  try {
    const esData = await this.esClient.get<ESSearchHit<ArtifactElasticsearchProperties>>({
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

export const deleteArtifact = async (esClient: ElasticsearchClient): Promise<void> => {};

export const listArtifacts = async (
  esClient: ElasticsearchClient
): Promise<ListResult<Artifact>> => {};
