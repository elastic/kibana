/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';
import { concat, defer, of } from 'rxjs';
import { concatMap, filter, map, shareReplay, take } from 'rxjs/operators';
import type {
  IEsSearchRequest,
  IKibanaSearchRequest,
  IKibanaSearchResponse,
} from '../../../../../../src/plugins/data/common';
import type {
  ISearchStrategy,
  PluginStart as DataPluginStart,
} from '../../../../../../src/plugins/data/server';
import { getLogEntryCursorFromHit } from '../../../common/log_entry';
import { decodeOrThrow } from '../../../common/runtime_types';
import {
  LogEntriesSearchRequestParams,
  logEntriesSearchRequestParamsRT,
  LogEntriesSearchResponsePayload,
  logEntriesSearchResponsePayloadRT,
} from '../../../common/search_strategies/log_entries/log_entries';
import type { IInfraSources } from '../../lib/sources';
import {
  createAsyncRequestRTs,
  createErrorFromShardFailure,
  jsonFromBase64StringRT,
} from '../../utils/typed_search_strategy';
import {
  createGetLogEntriesQuery,
  getLogEntriesResponseRT,
  LogEntryHit,
} from './queries/log_entries';

type LogEntriesSearchRequest = IKibanaSearchRequest<LogEntriesSearchRequestParams>;
type LogEntriesSearchResponse = IKibanaSearchResponse<LogEntriesSearchResponsePayload>;

export const logEntriesSearchStrategyProvider = ({
  data,
  sources,
}: {
  data: DataPluginStart;
  sources: IInfraSources;
}): ISearchStrategy<LogEntriesSearchRequest, LogEntriesSearchResponse> => {
  const esSearchStrategy = data.search.getSearchStrategy('ese');

  return {
    search: (rawRequest, options, dependencies) =>
      defer(() => {
        const request = decodeOrThrow(asyncRequestRT)(rawRequest);

        const sourceConfiguration$ = defer(() =>
          sources.getSourceConfiguration(dependencies.savedObjectsClient, request.params.sourceId)
        ).pipe(shareReplay(1));

        const recoveredRequest$ = of(request).pipe(
          filter(asyncRecoveredRequestRT.is),
          map(({ id: { esRequestId } }) => ({ id: esRequestId }))
        );

        const initialRequest$ = of(request).pipe(
          filter(asyncInitialRequestRT.is),
          concatMap(({ params }) =>
            sourceConfiguration$.pipe(
              map(
                ({ configuration }): IEsSearchRequest => ({
                  params: createGetLogEntriesQuery(configuration.logAlias),
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
            rawResponse: decodeOrThrow(getLogEntriesResponseRT)(esResponse.rawResponse),
          })),
          map((esResponse) => ({
            ...esResponse,
            ...(esResponse.id
              ? { id: logEntriesSearchRequestStateRT.encode({ esRequestId: esResponse.id }) }
              : {}),
            rawResponse: logEntriesSearchResponsePayloadRT.encode({
              data: { entries: [], topCursor: null, bottomCursor: null },
              // data: esResponse.rawResponse.hits.hits.map(createLogEntryFromHit)[0] ?? null,
              errors: (esResponse.rawResponse._shards.failures ?? []).map(
                createErrorFromShardFailure
              ),
            }),
          }))
        );
      }),
    cancel: async (id, options, dependencies) => {
      const { esRequestId } = decodeOrThrow(logEntriesSearchRequestStateRT)(id);
      return await esSearchStrategy.cancel?.(esRequestId, options, dependencies);
    },
  };
};

// exported for tests
export const logEntriesSearchRequestStateRT = rt.string.pipe(jsonFromBase64StringRT).pipe(
  rt.type({
    esRequestId: rt.string,
  })
);

const { asyncInitialRequestRT, asyncRecoveredRequestRT, asyncRequestRT } = createAsyncRequestRTs(
  logEntriesSearchRequestStateRT,
  logEntriesSearchRequestParamsRT
);

const createLogEntryFromHit = (hit: LogEntryHit) => ({
  id: hit._id,
  index: hit._index,
  cursor: getLogEntryCursorFromHit(hit),
  fields: Object.entries(hit.fields).map(([field, value]) => ({ field, value })),
});
