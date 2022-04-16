/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ElasticsearchClient,
  ElasticsearchServiceStart,
  KibanaRequest,
  SavedObjectsClientContract,
  SavedObjectsServiceStart,
} from '@kbn/core/server';
import { PluginStart as DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import {
  LogView,
  LogViewAttributes,
  LogViewsStaticConfig,
  ResolvedLogView,
} from '../../../common/log_views';
import { InfraSources } from '../../lib/sources';

export interface LogViewsServiceStartDeps {
  config: LogViewsStaticConfig;
  dataViews: DataViewsServerPluginStart;
  elasticsearch: ElasticsearchServiceStart;
  infraSources: InfraSources;
  savedObjects: SavedObjectsServiceStart;
}

export interface LogViewsServiceSetup {
  defineInternalLogView(logViewId: string, logViewAttributes: LogViewAttributes): void;
}

export interface LogViewsServiceStart {
  getClient(
    savedObjectsClient: SavedObjectsClientContract,
    elasticsearchClient: ElasticsearchClient,
    request?: KibanaRequest
  ): ILogViewsClient;
  getScopedClient(request: KibanaRequest): ILogViewsClient;
}

export interface ILogViewsClient {
  getLogView(logViewId: string): Promise<LogView>;
  getResolvedLogView(logViewId: string): Promise<ResolvedLogView>;
  putLogView(logViewId: string, logViewAttributes: Partial<LogViewAttributes>): Promise<LogView>;
  resolveLogView(logViewAttributes: LogViewAttributes): Promise<ResolvedLogView>;
}
