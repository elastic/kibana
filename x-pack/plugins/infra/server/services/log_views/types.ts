/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, SavedObjectsServiceStart } from 'src/core/server';
import { LogView, LogViewAttributes } from '../../../common/log_views';
import { InfraSources } from '../../lib/sources';

export interface LogViewsServiceSetupDeps {
  infraSources: InfraSources;
}

export interface LogViewsServiceStartDeps {
  infraSources: InfraSources;
  savedObjects: SavedObjectsServiceStart;
}

export interface LogViewsServiceSetup {
  defineInternalLogView(logViewId: string, logViewAttributes: LogViewAttributes): void;
}

export interface LogViewsServiceStart {
  getScopedClient(request: KibanaRequest): ILogViewsClient;
}

export interface ILogViewsClient {
  getLogView(logViewId: string): Promise<LogView>;
}
