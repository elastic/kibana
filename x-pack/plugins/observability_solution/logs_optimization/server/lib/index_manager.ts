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
  MappingProperty,
  MappingPropertyBase,
  PropertyName,
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
    } catch (error) {
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

    const lastIndexSummary = dataStream.indices.pop();
    if (!lastIndexSummary) {
      return null;
    }

    const indices = await this.esClient.indices.get({ index: lastIndexSummary.index_name });

    const lastIndex = indices[lastIndexSummary.index_name];

    return {
      ...lastIndex,
      name: lastIndexSummary.index_name,
      info: this.getDataStreamInfo(dataStream),
      flattenedMappings: lastIndex.mappings?.properties
        ? IndexManager.getFlattenedMappings(lastIndex.mappings.properties)
        : {},
    };
  }

  getCustomIndexTemplateName() {
    const { type, dataset } = IndexManager.extractDataStreamFields(this.indexPattern);

    return `${type}-${dataset}@custom`;
  }

  getDefaultPipelineName() {
    const { type, dataset } = IndexManager.extractDataStreamFields(this.indexPattern);

    return `${type}-${dataset}@default-pipeline`;
  }

  getDataStreamWildcard() {
    const { type, dataset } = IndexManager.extractDataStreamFields(this.indexPattern);

    return `${type}-${dataset}-*`;
  }

  static extractDataStreamFields(dataStreamName: string) {
    const regex = /^(?<type>[^-]+)-(?<dataset>[\S]+)-(?<namespace>[^-]+)$/;
    const match = dataStreamName.match(regex);
    return match?.groups ?? {};
  }

  static getFlattenedMappings(
    properties: Record<PropertyName, MappingPropertyBase>,
    prefix = ''
  ): Record<PropertyName, MappingProperty> {
    return Object.entries(properties).reduce((props, [propertyName, propertyObj]) => {
      const joinedPropertyName = [prefix, propertyName].filter(Boolean).join('.');

      if (propertyObj.properties) {
        return Object.assign(
          props,
          IndexManager.getFlattenedMappings(propertyObj.properties, joinedPropertyName)
        );
      }

      props[joinedPropertyName] = propertyObj;
      return props;
    }, {} as Record<PropertyName, MappingProperty>);
  }

  static create(esClient: ElasticsearchClient): IndexManagerCreator {
    return {
      fromIndexPattern(indexPattern: string) {
        return new IndexManager(esClient, indexPattern);
      },
    };
  }
}
