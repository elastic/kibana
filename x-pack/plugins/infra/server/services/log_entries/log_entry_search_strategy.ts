/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { concat, defer, of, forkJoin } from 'rxjs';
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
  LogEntrySearchRequestParams,
  logEntrySearchRequestParamsRT,
  LogEntrySearchResponsePayload,
  logEntrySearchResponsePayloadRT,
} from '../../../common/search_strategies/log_entries/log_entry';
import type { IInfraSources } from '../../lib/sources';
import {
  createAsyncRequestRTs,
  createErrorFromShardFailure,
  jsonFromBase64StringRT,
} from '../../utils/typed_search_strategy';
import { createGetLogEntryQuery, getLogEntryResponseRT, LogEntryHit } from './queries/log_entry';
import { resolveLogSourceConfiguration } from '../../../common/log_sources';

type LogEntrySearchRequest = IKibanaSearchRequest<LogEntrySearchRequestParams>;
type LogEntrySearchResponse = IKibanaSearchResponse<LogEntrySearchResponsePayload>;

export const logEntrySearchStrategyProvider = ({
  data,
  sources,
}: {
  data: DataPluginStart;
  sources: IInfraSources;
}): ISearchStrategy<LogEntrySearchRequest, LogEntrySearchResponse> => {
  const esSearchStrategy = data.search.getSearchStrategy('ese');

  return {
    search: (rawRequest, options, dependencies) =>
      defer(() => {
        const request = decodeOrThrow(asyncRequestRT)(rawRequest);

        const resolvedSourceConfiguration$ = defer(() =>
          forkJoin([
            sources.getSourceConfiguration(
              dependencies.savedObjectsClient,
              request.params.sourceId
            ),
            data.indexPatterns.indexPatternsServiceFactory(
              dependencies.savedObjectsClient,
              dependencies.esClient.asCurrentUser
            ),
          ]).pipe(
            concatMap(([sourceConfiguration, indexPatternsService]) =>
              resolveLogSourceConfiguration(sourceConfiguration.configuration, indexPatternsService)
            )
          )
        ).pipe(take(1), shareReplay(1));

        const recoveredRequest$ = of(request).pipe(
          filter(asyncRecoveredRequestRT.is),
          map(({ id: { esRequestId } }) => ({ id: esRequestId }))
        );

        const initialRequest$ = of(request).pipe(
          filter(asyncInitialRequestRT.is),
          concatMap(({ params }) =>
            resolvedSourceConfiguration$.pipe(
              map(
                ({
                  indices,
                  timestampField,
                  tiebreakerField,
                  runtimeMappings,
                }): IEsSearchRequest => ({
                  // @ts-expect-error @elastic/elasticsearch declares indices_boost as Record<string, number>
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
