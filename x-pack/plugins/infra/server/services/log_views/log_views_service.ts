/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ElasticsearchClient,
  KibanaRequest,
  Logger,
  SavedObjectsClientContract,
} from 'src/core/server';
import { LogView, LogViewAttributes } from '../../../common/log_views';
import { LogViewsClient } from './log_views_client';
import { LogViewsServiceSetup, LogViewsServiceStart, LogViewsServiceStartDeps } from './types';

export class LogViewsService {
  private internalLogViews: Map<string, LogView> = new Map();

  constructor(private readonly logger: Logger) {}

  public setup(): LogViewsServiceSetup {
    const { internalLogViews } = this;

    return {
      defineInternalLogView(logViewId: string, logViewAttributes: LogViewAttributes) {
        internalLogViews.set(logViewId, {
          id: logViewId,
          origin: 'internal',
          attributes: logViewAttributes,
          updatedAt: Date.now(),
        });
      },
    };
  }

  public start({
    config,
    dataViews,
    elasticsearch,
    infraSources,
    savedObjects,
  }: LogViewsServiceStartDeps): LogViewsServiceStart {
    const { internalLogViews, logger } = this;

    return {
      getClient(
        savedObjectsClient: SavedObjectsClientContract,
        elasticsearchClient: ElasticsearchClient,
        request?: KibanaRequest
      ) {
        return new LogViewsClient(
          logger,
          dataViews.dataViewsServiceFactory(savedObjectsClient, elasticsearchClient, request),
          savedObjectsClient,
          infraSources,
          internalLogViews,
          config
        );
      },
      getScopedClient(request: KibanaRequest) {
        const savedObjectsClient = savedObjects.getScopedClient(request);
        const elasticsearchClient = elasticsearch.client.asScoped(request).asCurrentUser;

        return this.getClient(savedObjectsClient, elasticsearchClient, request);
      },
    };
  }
}
