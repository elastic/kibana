/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from 'src/core/public';
import { DataViewsContract } from 'src/plugins/data_views/public';
import { LogView, LogViewAttributes, ResolvedLogView } from '../../../common/log_views';

export type LogViewsServiceSetup = void;

export interface LogViewsServiceStart {
  client: ILogViewsClient;
}

export interface LogViewsServiceStartDeps {
  dataViews: DataViewsContract;
  http: HttpStart;
}

export interface ILogViewsClient {
  getLogView(logViewId: string): Promise<LogView>;
  getResolvedLogView(logViewId: string): Promise<ResolvedLogView>;
  putLogView(logViewId: string, logViewAttributes: Partial<LogViewAttributes>): Promise<LogView>;
  resolveLogView(logViewAttributes: LogViewAttributes): Promise<ResolvedLogView>;
}
