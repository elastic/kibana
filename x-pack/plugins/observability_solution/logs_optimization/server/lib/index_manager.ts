/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { NewestIndex } from '../../common/types';

export interface IndexManagerCreator {
  fromIndexPattern: (indexPattern: string) => IndexManager;
}

export class IndexManager {
  private constructor(private esClient: ElasticsearchClient, private indexPattern: string) {}

  async getDataStreamInfo() {
    const dataStream = await this.getDataStream();

    if (!dataStream) {
      return {};
    }

    const { type, dataset, namespace } = IndexManager.extractDataStreamFields(dataStream.name);

    return {
      isManaged: dataStream._meta?.isManaged ?? false,
      integration: dataStream._meta?.package?.name ?? null,
      type,
      dataset,
      namespace,
    };
  }

  getIndexIntegration() {}

  async getDataStream() {
    try {
      const { data_streams: dataStreams } = await this.esClient.indices.getDataStream({
        name: this.indexPattern,
      });
      return dataStreams.at(0);
    } catch (error) {
      return null;
    }
  }

  async getLastDataStreamIndex(): Promise<NewestIndex | null> {
    const dataStream = await this.getDataStream();

    if (!dataStream) {
      return null;
    }

    const lastIndex = dataStream.indices.pop();

    if (!lastIndex) {
      return null;
    }

    const indices = await this.esClient.indices.get({ index: lastIndex.index_name });

    return {
      name: lastIndex.index_name,
      ...indices[lastIndex.index_name],
    };
  }

  static extractDataStreamFields(dataStreamName: string) {
    const regex = /^(?<type>[^-]+)-(?<dataset>[\S]+)-(?<namespace>[^-]+)$/;
    const match = dataStreamName.match(regex);
    return match?.groups ?? {};
  }

  static create(esClient: ElasticsearchClient): IndexManagerCreator {
    return {
      fromIndexPattern(indexPattern: string) {
        return new IndexManager(esClient, indexPattern);
      },
    };
  }
}
