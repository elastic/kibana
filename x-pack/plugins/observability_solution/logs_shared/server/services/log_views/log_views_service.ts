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
} from '@kbn/core/server';
import { LogSourcesService } from '@kbn/logs-data-access-plugin/common/types';
import {
  defaultLogViewAttributes,
  defaultLogViewsStaticConfig,
  LogView,
  LogViewAttributes,
  LogViewsStaticConfig,
} from '../../../common/log_views';
import { LogViewsClient } from './log_views_client';
import {
  LogViewFallbackHandler,
  LogViewsServiceSetup,
  LogViewsServiceStart,
  LogViewsServiceStartDeps,
} from './types';

export class LogViewsService {
  private internalLogViews: Map<string, LogView> = new Map();
  private logViewFallbackHandler: LogViewFallbackHandler | null = null;
  private logViewsStaticConfig: LogViewsStaticConfig = defaultLogViewsStaticConfig;

  constructor(private readonly logger: Logger) {}

  public setup(): LogViewsServiceSetup {
    const { internalLogViews } = this;

    return {
      defineInternalLogView: (logViewId: string, logViewAttributes: Partial<LogViewAttributes>) => {
        internalLogViews.set(logViewId, {
          id: logViewId,
          origin: 'internal',
          attributes: { ...defaultLogViewAttributes, ...logViewAttributes },
          updatedAt: Date.now(),
        });
      },
      registerLogViewFallbackHandler: (handler) => {
        this.logViewFallbackHandler = handler;
      },
      setLogViewsStaticConfig: (config: LogViewsStaticConfig) => {
        this.logViewsStaticConfig = config;
      },
    };
  }

  public start({
    dataViews,
    logsDataAccess,
    elasticsearch,
    savedObjects,
  }: LogViewsServiceStartDeps): LogViewsServiceStart {
    const { internalLogViews, logger, logViewFallbackHandler, logViewsStaticConfig } = this;

    return {
      getClient(
        savedObjectsClient: SavedObjectsClientContract,
        elasticsearchClient: ElasticsearchClient,
        logSourcesService: Promise<LogSourcesService>,
        request?: KibanaRequest
      ) {
        return new LogViewsClient(
          logger,
          dataViews.dataViewsServiceFactory(savedObjectsClient, elasticsearchClient, request),
          logSourcesService,
          savedObjectsClient,
          logViewFallbackHandler,
          internalLogViews,
          logViewsStaticConfig
        );
      },
      getScopedClient(request: KibanaRequest) {
        const savedObjectsClient = savedObjects.getScopedClient(request);
        const elasticsearchClient = elasticsearch.client.asScoped(request).asCurrentUser;
        const logSourcesService =
          logsDataAccess.services.logSourcesServiceFactory.getScopedLogSourcesService(request);
        return this.getClient(savedObjectsClient, elasticsearchClient, logSourcesService, request);
      },
    };
  }
}
