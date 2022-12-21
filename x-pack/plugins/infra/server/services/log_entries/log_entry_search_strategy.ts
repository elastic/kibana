/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { concat, defer, of } from 'rxjs';
import { concatMap, filter, map, shareReplay, take } from 'rxjs/operators';
import type {
  IEsSearchRequest,
  IKibanaSearchRequest,
  IKibanaSearchResponse,
} from '@kbn/data-plugin/common';
import type { ISearchStrategy, PluginStart as DataPluginStart } from '@kbn/data-plugin/server';
import { getLogEntryCursorFromHit } from '../../../common/log_entry';
import { decodeOrThrow } from '../../../common/runtime_types';
import {
  LogEntrySearchRequestParams,
  logEntrySearchRequestParamsRT,
  LogEntrySearchResponsePayload,
  logEntrySearchResponsePayloadRT,
} from '../../../common/search_strategies/log_entries/log_entry';
import {
  createAsyncRequestRTs,
  createErrorFromShardFailure,
  jsonFromBase64StringRT,
} from '../../utils/typed_search_strategy';
import { LogViewsServiceStart } from '../log_views/types';
import { createGetLogEntryQuery, getLogEntryResponseRT, LogEntryHit } from './queries/log_entry';

type LogEntrySearchRequest = IKibanaSearchRequest<LogEntrySearchRequestParams>;
type LogEntrySearchResponse = IKibanaSearchResponse<LogEntrySearchResponsePayload>;

export const logEntrySearchStrategyProvider = ({
  data,
  logViews,
}: {
  data: DataPluginStart;
  logViews: LogViewsServiceStart;
}): ISearchStrategy<LogEntrySearchRequest, LogEntrySearchResponse> => {
  const esSearchStrategy = data.search.getSearchStrategy('ese');

  return {
    search: (rawRequest, options, dependencies) =>
      defer(() => {
        const request = decodeOrThrow(asyncRequestRT)(rawRequest);

        const resolvedLogView$ = defer(() =>
          logViews.getScopedClient(dependencies.request).getResolvedLogView(request.params.sourceId)
        ).pipe(take(1), shareReplay(1));

        const recoveredRequest$ = of(request).pipe(
          filter(asyncRecoveredRequestRT.is),
          map(({ id: { esRequestId } }) => ({ id: esRequestId }))
        );

        const initialRequest$ = of(request).pipe(
          filter(asyncInitialRequestRT.is),
          concatMap(({ params }) =>
            resolvedLogView$.pipe(
              map(
                ({
                  indices,
                  timestampField,
                  tiebreakerField,
                  runtimeMappings,
                }): IEsSearchRequest => ({
                  params: createGetLogEntryQuery(
                    indices,
                    params.logEntryId,
                    timestampField,
                    tiebreakerField,
                    runtimeMappings
                  ),
                })
              )
            )
          )
        );

        return concat(recoveredRequest$, initialRequest$).pipe(
          take(1),
          concatMap((esRequest) => esSearchStrategy.search(esRequest, options, dependencies)),
          map((esResponse) => ({
            ...esResponse,
            rawResponse: decodeOrThrow(getLogEntryResponseRT)(esResponse.rawResponse),
          })),
          map((esResponse) => ({
            ...esResponse,
            ...(esResponse.id
              ? { id: logEntrySearchRequestStateRT.encode({ esRequestId: esResponse.id }) }
              : {}),
            rawResponse: logEntrySearchResponsePayloadRT.encode({
              data: esResponse.rawResponse.hits.hits.map(createLogEntryFromHit)[0] ?? null,
              errors: (esResponse.rawResponse._shards.failures ?? []).map(
                createErrorFromShardFailure
              ),
            }),
          }))
        );
      }),
    cancel: async (id, options, dependencies) => {
      const { esRequestId } = decodeOrThrow(logEntrySearchRequestStateRT)(id);
      return await esSearchStrategy.cancel?.(esRequestId, options, dependencies);
    },
  };
};

// exported for tests
export const logEntrySearchRequestStateRT = rt.string.pipe(jsonFromBase64StringRT).pipe(
  rt.type({
    esRequestId: rt.string,
  })
);

const { asyncInitialRequestRT, asyncRecoveredRequestRT, asyncRequestRT } = createAsyncRequestRTs(
  logEntrySearchRequestStateRT,
  logEntrySearchRequestParamsRT
);

const createLogEntryFromHit = (hit: LogEntryHit) => ({
  id: hit._id,
  index: hit._index,
  cursor: getLogEntryCursorFromHit(hit),
  fields: Object.entries(hit.fields ?? {}).map(([field, value]) => ({ field, value })),
});
