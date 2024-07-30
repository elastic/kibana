/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IndicesDataStream,
  IndicesPutIndexTemplateRequest,
  IngestPipeline,
} from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import deepmerge from 'deepmerge';
import { DataStreamInfo, NewestIndex } from '../../common/types';

export interface IndexManagerCreator {
  fromIndexPattern: (indexPattern: string) => IndexManager;
}

export class IndexManager {
  private constructor(private esClient: ElasticsearchClient, private indexPattern: string) {}

  getDataStreamInfo(dataStream: IndicesDataStream | null): DataStreamInfo {
    if (!dataStream) {
      return {};
    }

    const { type, dataset, namespace } = IndexManager.extractDataStreamFields(dataStream.name);

    return {
      isManaged: dataStream._meta?.managed ?? false,
      isManagedByFleet: dataStream._meta?.managed_by === 'fleet' ?? false,
      integration: dataStream._meta?.package?.name ?? null,
      template: dataStream.template,
      type,
      dataset,
      namespace,
    };
  }

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

  async getIndexTemplate(name: string) {
    try {
      const { index_templates: indexTemplates } = await this.esClient.indices.getIndexTemplate({
        name,
      });

      return indexTemplates.at(0)?.index_template ?? null;
    } catch (error) {
      return null;
    }
  }

  async updateIndexTemplate(
    name: string,
    templateChanges: Omit<IndicesPutIndexTemplateRequest, 'name'>
  ) {
    try {
      return await this.esClient.indices.putIndexTemplate({
        name,
        ...templateChanges,
      });

      // return indexTemplates.at(0)?.index_template ?? null;
    } catch (error) {
      console.log(error);

      return null;
    }
  }

  async updateIndexPipeline(id: string, pipelineUpdates: Omit<IngestPipeline, 'id'>) {
    let pipeline: IngestPipeline = {
      description: `Pipeline for parsing ${id} logs.`,
      processors: [],
    };

    try {
      const pipelines = await this.esClient.ingest.getPipeline({ id });
      pipeline = pipelines[id];
    } catch {}

    const pipelineDraft = deepmerge(pipeline, pipelineUpdates);

    return this.esClient.ingest.putPipeline({ id, ...pipelineDraft });
  }

  rollover() {
    return this.esClient.indices.rollover({ alias: this.indexPattern });
  }

  async getNewestDataStreamIndex(): Promise<NewestIndex | null> {
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
      ...indices[lastIndex.index_name],
      name: lastIndex.index_name,
      info: this.getDataStreamInfo(dataStream),
    };
  }

  getCustomIndexTemplateName(dataStreamName: string) {
    const { type, dataset } = IndexManager.extractDataStreamFields(dataStreamName);

    return `${type}-${dataset}@custom`;
  }

  getDefaultPipelineName(dataStreamName: string) {
    const { type, dataset } = IndexManager.extractDataStreamFields(dataStreamName);

    return `${type}-${dataset}@default-pipeline`;
  }

  getDataStreamWildcard(dataStreamName: string) {
    const { type, dataset } = IndexManager.extractDataStreamFields(dataStreamName);

    return `${type}-${dataset}-*`;
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
