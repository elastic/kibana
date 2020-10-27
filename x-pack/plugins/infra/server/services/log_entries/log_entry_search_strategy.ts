/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';
import { of } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';
import { decodeOrThrow } from '../../../common/runtime_types';
import {
  IEsSearchRequest,
  IKibanaSearchRequest,
  IKibanaSearchResponse,
} from '../../../../../../src/plugins/data/common';
import {
  ISearchStrategy,
  PluginStart as DataPluginStart,
} from '../../../../../../src/plugins/data/server';
import {
  LogEntrySearchRequestParams,
  logEntrySearchRequestParamsRT,
  LogEntrySearchResponsePayload,
  logEntrySearchResponsePayloadRT,
} from '../../../common/search_strategies/log_entries/log_entry';
import type { InfraSources } from '../../lib/sources';
import { createGetLogEntryQuery, getLogEntryResponseRT } from './queries/log_entry';

type LogEntrySearchRequest = IKibanaSearchRequest<LogEntrySearchRequestParams>;
type LogEntrySearchResponse = IKibanaSearchResponse<LogEntrySearchResponsePayload>;

export const logEntrySearchStrategyProvider = ({
  data,
  sources,
}: {
  data: DataPluginStart;
  sources: InfraSources;
}): ISearchStrategy<LogEntrySearchRequest, LogEntrySearchResponse> => {
  const esSearchStrategy = data.search.getSearchStrategy('ese');

  return {
    search: (logEntrySearchRequest, options, context) =>
      of(logEntrySearchRequest).pipe(
        mergeMap(
          async (request): Promise<IEsSearchRequest> => {
            if (isGetRequest(request)) {
              return { id: request.id };
            } else if (isSubmitRequest(logEntrySearchRequestParamsRT)(request)) {
              const sourceConfiguration = await sources.getSourceConfiguration(
                context.core.savedObjects.client,
                request.params.sourceId
              );

              return {
                params: createGetLogEntryQuery(
                  sourceConfiguration.configuration.logAlias,
                  request.params.logEntryId,
                  sourceConfiguration.configuration.fields.timestamp,
                  sourceConfiguration.configuration.fields.tiebreaker
                ),
              };
            } else {
              throw new Error(); // TODO: throw correct error
            }
          }
        ),
        mergeMap((esRequest) => esSearchStrategy.search(esRequest, options, context)),
        map((response) => {
          // TODO: handle ES errors
          const getLogEntryResponse = decodeOrThrow(getLogEntryResponseRT)(response.rawResponse);
          const logEntrySearchResponsePayload = logEntrySearchResponsePayloadRT.encode({
            data: {},
          });

          return {
            ...response,
            rawResponse: logEntrySearchResponsePayload,
          };
        })
      ),
    cancel: async (context, id) => {
      return Promise.resolve(undefined);
    },
  };
};

const isGetRequest = rt.type({ id: rt.string }).is;

const isSubmitRequest = <ParamsCodec extends rt.Mixed>(params: ParamsCodec) =>
  rt.type({
    params,
  }).is;
