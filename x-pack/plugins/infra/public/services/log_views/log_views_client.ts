/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from 'src/core/public';
import { DataViewsContract } from 'src/plugins/data_views/public';
import {
  getLogViewResponsePayloadRT,
  getLogViewUrl,
  putLogViewRequestPayloadRT,
} from '../../../common/http_api/log_views';
import {
  FetchLogViewError,
  LogView,
  LogViewAttributes,
  LogViewsStaticConfig,
  PutLogViewError,
  ResolvedLogView,
  resolveLogView,
} from '../../../common/log_views';
import { decodeOrThrow } from '../../../common/runtime_types';
import { ILogViewsClient } from './types';

export class LogViewsClient implements ILogViewsClient {
  constructor(
    private readonly dataViews: DataViewsContract,
    private readonly http: HttpStart,
    private readonly config: LogViewsStaticConfig
  ) {}

  public async getLogView(logViewId: string): Promise<LogView> {
    const response = await this.http.get(getLogViewUrl(logViewId)).catch((error) => {
      throw new FetchLogViewError(`Failed to fetch log view "${logViewId}": ${error}`);
    });

    const { data } = decodeOrThrow(
      getLogViewResponsePayloadRT,
      (message: string) =>
        new FetchLogViewError(`Failed to decode log view "${logViewId}": ${message}"`)
    )(response);

    return data;
  }

  public async getResolvedLogView(logViewId: string): Promise<ResolvedLogView> {
    const logView = await this.getLogView(logViewId);
    const resolvedLogView = await this.resolveLogView(logView.attributes);
    return resolvedLogView;
  }

  public async putLogView(
    logViewId: string,
    logViewAttributes: Partial<LogViewAttributes>
  ): Promise<LogView> {
    const response = await this.http
      .put(getLogViewUrl(logViewId), {
        body: JSON.stringify(putLogViewRequestPayloadRT.encode({ attributes: logViewAttributes })),
      })
      .catch((error) => {
        throw new PutLogViewError(`Failed to write log view "${logViewId}": ${error}`);
      });

    const { data } = decodeOrThrow(
      getLogViewResponsePayloadRT,
      (message: string) =>
        new PutLogViewError(`Failed to decode written log view "${logViewId}": ${message}"`)
    )(response);

    return data;
  }

  public async resolveLogView(logViewAttributes: LogViewAttributes): Promise<ResolvedLogView> {
    return await resolveLogView(logViewAttributes, this.dataViews, this.config);
  }
}
