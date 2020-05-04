/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Logger, LoggerFactory, RequestHandlerContext } from 'kibana/server';
import { AlertConstants } from '../common/alert_constants';
import { ESIndexPatternService } from '../../ingest_manager/server';

export interface IndexPatternRetriever {
  getIndexPattern(ctx: RequestHandlerContext, datasetPath: string): Promise<string>;
  getEventIndexPattern(ctx: RequestHandlerContext): Promise<string>;
  getMetadataIndexPattern(ctx: RequestHandlerContext): Promise<string>;
}

/**
 * This class is used to retrieve an index pattern. It should be used in the server side code whenever
 * an index pattern is needed to query data within ES. The index pattern is constructed by the Ingest Manager
 * based on the contents of the Endpoint Package in the Package Registry.
 */
export class IngestIndexPatternRetriever implements IndexPatternRetriever {
  private static endpointPackageName = 'endpoint';
  private static metadataDataset = 'metadata';
  private readonly log: Logger;
  constructor(private readonly service: ESIndexPatternService, loggerFactory: LoggerFactory) {
    this.log = loggerFactory.get('index-pattern-retriever');
  }

  /**
   * Retrieves the index pattern for querying events within elasticsearch.
   *
   * @param ctx a RequestHandlerContext from a route handler
   * @returns a string representing the index pattern (e.g. `events-endpoint-*`)
   */
  async getEventIndexPattern(ctx: RequestHandlerContext) {
    return await this.getIndexPattern(ctx, AlertConstants.EVENT_DATASET);
  }

  /**
   * Retrieves the index pattern for querying endpoint metadata within elasticsearch.
   *
   * @param ctx a RequestHandlerContext from a route handler
   * @returns a string representing the index pattern (e.g. `metrics-endpoint-*`)
   */
  async getMetadataIndexPattern(ctx: RequestHandlerContext) {
    return await this.getIndexPattern(ctx, IngestIndexPatternRetriever.metadataDataset);
  }

  /**
   * Retrieves the index pattern for a specific dataset for querying endpoint data.
   *
   * @param ctx a RequestHandlerContext from a route handler
   * @param datasetPath a string of the path being used for a dataset within the Endpoint Package
   * (e.g. `events`, `metadata`)
   * @returns a string representing the index pattern (e.g. `metrics-endpoint-*`)
   */
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
