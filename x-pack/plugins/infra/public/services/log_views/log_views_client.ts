/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { HttpStart } from 'src/core/public';
import { ISearchGeneric } from 'src/plugins/data/public';
import { DataViewsContract } from 'src/plugins/data_views/public';
import {
  getLogViewResponsePayloadRT,
  getLogViewUrl,
  putLogViewRequestPayloadRT,
} from '../../../common/http_api/log_views';
import {
  FetchLogViewError,
  FetchLogViewStatusError,
  LogView,
  LogViewAttributes,
  LogViewsStaticConfig,
  LogViewStatus,
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
    private readonly search: ISearchGeneric,
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

  public async getResolvedLogViewStatus(resolvedLogView: ResolvedLogView): Promise<LogViewStatus> {
    const indexStatus = await this.search({
      params: {
        ignore_unavailable: true,
        allow_no_indices: true,
        index: resolvedLogView.indices,
        size: 0,
        terminate_after: 1,
        track_total_hits: 1,
      },
    })
      .toPromise()
      .then(
        ({ rawResponse }) => {
          if (rawResponse._shards.total <= 0) {
            return 'missing' as const;
          }

          const totalHits = decodeTotalHits(rawResponse.hits.total);
          if (typeof totalHits === 'number' ? totalHits > 0 : totalHits.value > 0) {
            return 'available' as const;
          }

          return 'empty' as const;
        },
        (err) => {
          if (err.status === 404) {
            return 'missing' as const;
          }
          throw new FetchLogViewStatusError(
            `Failed to check status of log indices of "${resolvedLogView.indices}": ${err}`
          );
        }
      );

    return {
      index: indexStatus,
    };
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

const decodeTotalHits = decodeOrThrow(
  rt.union([
    rt.number,
    rt.type({
      value: rt.number,
    }),
  ])
);
