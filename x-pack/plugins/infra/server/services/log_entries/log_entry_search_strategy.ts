/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';
import { concat, defer, of } from 'rxjs';
import { concatMap, filter, map, shareReplay, take } from 'rxjs/operators';
import {
  IEsSearchRequest,
  IKibanaSearchRequest,
  IKibanaSearchResponse,
} from '../../../../../../src/plugins/data/common';
import {
  ISearchStrategy,
  PluginStart as DataPluginStart,
} from '../../../../../../src/plugins/data/server';
import { getLogEntryCursorFromFields } from '../../../common/log_entry';
import { decodeOrThrow } from '../../../common/runtime_types';
import {
  LogEntrySearchRequestParams,
  logEntrySearchRequestParamsRT,
  LogEntrySearchResponsePayload,
  logEntrySearchResponsePayloadRT,
} from '../../../common/search_strategies/log_entries/log_entry';
import type { IInfraSources } from '../../lib/sources';
import { jsonFromBase64StringRT } from '../../utils/typed_search_strategy';
import { createGetLogEntryQuery, getLogEntryResponseRT } from './queries/log_entry';

type LogEntrySearchRequest = IKibanaSearchRequest<LogEntrySearchRequestParams>;
type LogEntrySearchResponse = IKibanaSearchResponse<LogEntrySearchResponsePayload>;

const logEntrySearchRequestStateRT = rt.string.pipe(jsonFromBase64StringRT).pipe(
  rt.type({
    esRequestId: rt.string,
  })
);

const asyncGetRequestRT = rt.type({
  id: logEntrySearchRequestStateRT,
  params: logEntrySearchRequestParamsRT,
});

const asyncSubmitRequestRT = rt.type({
  params: logEntrySearchRequestParamsRT,
});

const asyncRequestRT = rt.union([asyncGetRequestRT, asyncSubmitRequestRT]);

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

        const sourceConfiguration$ = defer(() =>
          sources.getSourceConfiguration(dependencies.savedObjectsClient, request.params.sourceId)
        ).pipe(shareReplay(1));

        const recoveredRequest$ = of(request).pipe(
          filter(asyncGetRequestRT.is),
          map(({ id: { esRequestId } }) => ({ id: esRequestId }))
        );

        const initialRequest$ = of(request).pipe(
          filter(asyncSubmitRequestRT.is),
          concatMap(({ params }) =>
            sourceConfiguration$.pipe(
              map(
                ({ configuration }): IEsSearchRequest => ({
                  params: createGetLogEntryQuery(
                    configuration.logAlias,
                    params.logEntryId,
                    configuration.fields.timestamp,
                    configuration.fields.tiebreaker
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
          concatMap((esResponse) =>
            sourceConfiguration$.pipe(
              map(({ configuration }) => ({
                ...esResponse,
                ...(esResponse.id
                  ? { id: logEntrySearchRequestStateRT.encode({ esRequestId: esResponse.id }) }
                  : {}),
                rawResponse: logEntrySearchResponsePayloadRT.encode({
                  data:
                    esResponse.rawResponse.hits.hits.map((hit) => ({
                      id: hit._id,
                      index: hit._index,
                      key: getLogEntryCursorFromFields(
                        configuration.fields.timestamp,
                        configuration.fields.tiebreaker
                      )(hit.fields),
                      fields: [],
                    }))[0] ?? null,
                }),
              }))
            )
          )
        );
      }),
    cancel: async (id, options, dependencies) => {
      const { esRequestId } = decodeOrThrow(logEntrySearchRequestStateRT)(id);
      return await esSearchStrategy.cancel?.(esRequestId, options, dependencies);
    },
  };
};
