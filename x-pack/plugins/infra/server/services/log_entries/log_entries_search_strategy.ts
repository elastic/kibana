/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pick } from '@kbn/std';
import * as rt from 'io-ts';
import { combineLatest, concat, defer, forkJoin, of } from 'rxjs';
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
import { LogSourceColumnConfiguration } from '../../../common/http_api/log_sources';
import {
  getLogEntryCursorFromHit,
  LogColumn,
  LogEntry,
  LogEntryAfterCursor,
  logEntryAfterCursorRT,
  LogEntryBeforeCursor,
  logEntryBeforeCursorRT,
  LogEntryContext,
} from '../../../common/log_entry';
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
  CompiledLogMessageFormattingRule,
  compileFormattingRules,
  getBuiltinRules,
} from './message';
import {
  createGetLogEntriesQuery,
  getLogEntriesResponseRT,
  getSortDirection,
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
        ).pipe(take(1), shareReplay(1));

        const messageFormattingRules$ = defer(() =>
          sourceConfiguration$.pipe(
            map(({ configuration }) =>
              compileFormattingRules(getBuiltinRules(configuration.fields.message))
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
            forkJoin([sourceConfiguration$, messageFormattingRules$]).pipe(
              map(
                ([{ configuration }, messageFormattingRules]): IEsSearchRequest => {
                  return {
                    params: createGetLogEntriesQuery(
                      configuration.logAlias,
                      params.startTimestamp,
                      params.endTimestamp,
                      pickRequestCursor(params),
                      params.size + 1,
                      configuration.fields.timestamp,
                      configuration.fields.tiebreaker,
                      messageFormattingRules.requiredFields,
                      params.query,
                      params.highlightPhrase
                    ),
                  };
                }
              )
            )
          )
        );

        const searchResponse$ = concat(recoveredRequest$, initialRequest$).pipe(
          take(1),
          concatMap((esRequest) => esSearchStrategy.search(esRequest, options, dependencies))
        );

        return combineLatest([searchResponse$, sourceConfiguration$, messageFormattingRules$]).pipe(
          map(([esResponse, { configuration }, messageFormattingRules]) => {
            const rawResponse = decodeOrThrow(getLogEntriesResponseRT)(esResponse.rawResponse);

            const entries = rawResponse.hits.hits
              .slice(0, request.params.size)
              .map(getLogEntryFromHit(configuration.logColumns, messageFormattingRules));

            const sortDirection = getSortDirection(pickRequestCursor(request.params));

            if (sortDirection === 'desc') {
              entries.reverse();
            }

            const hasMore = rawResponse.hits.hits.length > entries.length;
            const hasMoreBefore = sortDirection === 'desc' ? hasMore : undefined;
            const hasMoreAfter = sortDirection === 'asc' ? hasMore : undefined;

            const { topCursor, bottomCursor } = getResponseCursors(entries);

            const errors = (rawResponse._shards.failures ?? []).map(createErrorFromShardFailure);

            return {
              ...esResponse,
              ...(esResponse.id
                ? { id: logEntriesSearchRequestStateRT.encode({ esRequestId: esResponse.id }) }
                : {}),
              rawResponse: logEntriesSearchResponsePayloadRT.encode({
                data: { entries, topCursor, bottomCursor, hasMoreBefore, hasMoreAfter },
                errors,
              }),
            };
          })
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

const getLogEntryFromHit = (
  columnDefinitions: LogSourceColumnConfiguration[],
  messageFormattingRules: CompiledLogMessageFormattingRule
) => (hit: LogEntryHit): LogEntry => {
  const cursor = getLogEntryCursorFromHit(hit);
  return {
    id: hit._id,
    index: hit._index,
    cursor,
    columns: columnDefinitions.map(
      (column): LogColumn => {
        if ('timestampColumn' in column) {
          return {
            columnId: column.timestampColumn.id,
            timestamp: cursor.time,
          };
        } else if ('messageColumn' in column) {
          return {
            columnId: column.messageColumn.id,
            message: messageFormattingRules.format(hit.fields, hit.highlight || {}),
          };
        } else {
          return {
            columnId: column.fieldColumn.id,
            field: column.fieldColumn.field,
            value: hit.fields[column.fieldColumn.field] ?? [],
            highlights: hit.highlight?.[column.fieldColumn.field] ?? [],
          };
        }
      }
    ),
    context: getContextFromHit(hit),
  };
};

const pickRequestCursor = (
  params: LogEntriesSearchRequestParams
): LogEntryAfterCursor | LogEntryBeforeCursor | null => {
  if (logEntryAfterCursorRT.is(params)) {
    return pick(params, ['after']);
  } else if (logEntryBeforeCursorRT.is(params)) {
    return pick(params, ['before']);
  }

  return null;
};

const getContextFromHit = (hit: LogEntryHit): LogEntryContext => {
  // Get all context fields, then test for the presence and type of the ones that go together
  const containerId = hit.fields['container.id']?.[0];
  const hostName = hit.fields['host.name']?.[0];
  const logFilePath = hit.fields['log.file.path']?.[0];

  if (typeof containerId === 'string') {
    return { 'container.id': containerId };
  }

  if (typeof hostName === 'string' && typeof logFilePath === 'string') {
    return { 'host.name': hostName, 'log.file.path': logFilePath };
  }

  return {};
};

function getResponseCursors(entries: LogEntry[]) {
  const hasEntries = entries.length > 0;
  const topCursor = hasEntries ? entries[0].cursor : null;
  const bottomCursor = hasEntries ? entries[entries.length - 1].cursor : null;

  return { topCursor, bottomCursor };
}
