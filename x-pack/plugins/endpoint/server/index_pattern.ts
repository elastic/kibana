/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Logger, LoggerFactory, RequestHandlerContext } from 'kibana/server';
import { ESIndexPatternService } from '../../ingest_manager/server';
import { EndpointAppConstants } from '../common/types';

export interface IndexPatternRetriever {
  getIndexPattern(ctx: RequestHandlerContext, datasetPath: string): Promise<string>;
  getEventIndexPattern(ctx: RequestHandlerContext): Promise<string>;
  getMetadataIndexPattern(ctx: RequestHandlerContext): Promise<string>;
}

export class IngestIndexPatternRetriever implements IndexPatternRetriever {
  private static endpointPackageName = 'endpoint';
  private static metadataDataset = 'metadata';
  private readonly log: Logger;
  constructor(private readonly service: ESIndexPatternService, loggerFactory: LoggerFactory) {
    this.log = loggerFactory.get('index-pattern-retriever');
  }

  async getEventIndexPattern(ctx: RequestHandlerContext) {
    return await this.getIndexPattern(ctx, EndpointAppConstants.EVENT_DATASET);
  }

  async getMetadataIndexPattern(ctx: RequestHandlerContext) {
    return await this.getIndexPattern(ctx, IngestIndexPatternRetriever.metadataDataset);
  }

  async getIndexPattern(ctx: RequestHandlerContext, datasetPath: string) {
    try {
      const pattern = await this.service.getESIndexPattern(
        ctx.core.savedObjects.client,
        IngestIndexPatternRetriever.endpointPackageName,
        datasetPath
      );

      if (!pattern) {
        const msg = `Unable to retrieve the index pattern for dataset: ${datasetPath}`;
        this.log.warn(msg);
        throw new Error(msg);
      }
      return pattern;
    } catch (error) {
      const errMsg = `Error occurred while retrieving pattern for: ${datasetPath} error: ${error}`;
      this.log.warn(errMsg);
      throw new Error(errMsg);
    }
  }
}
