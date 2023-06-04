/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from '@kbn/core/public';
import { ISearchStart } from '@kbn/data-plugin/public';
import { DataViewsContract } from '@kbn/data-views-plugin/public';
import { ILogViewsClient, LogViewStatus, ResolvedLogView } from '../../../common/log_views';

export type LogViewsServiceSetup = void;

export interface LogViewsServiceStartDeps {
  dataViews: DataViewsContract;
  http: HttpStart;
  search: ISearchStart;
}

export interface LogViewsServiceStart {
  client: ILogViewsPublicClient;
}

export interface ILogViewsPublicClient extends ILogViewsClient {
  getResolvedLogViewStatus(resolvedLogView: ResolvedLogView): Promise<LogViewStatus>;
}
