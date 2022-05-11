/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StoryContext } from '@storybook/react';
import React from 'react';
import { defer, of, Subject } from 'rxjs';
import { delay } from 'rxjs/operators';
import {
  ENHANCED_ES_SEARCH_STRATEGY,
  ES_SEARCH_STRATEGY,
  FieldSpec,
} from '@kbn/data-plugin/common';
import {
  IEsSearchResponse,
  IKibanaSearchRequest,
  IKibanaSearchResponse,
  ISearchOptions,
} from '@kbn/data-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { getLogViewResponsePayloadRT } from '../../../common/http_api/log_views';
import { defaultLogViewAttributes } from '../../../common/log_views';
import {
  LogEntriesSearchResponsePayload,
  LOG_ENTRIES_SEARCH_STRATEGY,
} from '../../../common/search_strategies/log_entries/log_entries';
import { ENTRIES_EMPTY, generateFakeEntries } from '../../test_utils/entries';

export const decorateWithKibanaContext = <StoryFnReactReturnType extends React.ReactNode>(
  wrappedStory: () => StoryFnReactReturnType,
  _storyContext: StoryContext
) => {
  const data = {
    dataViews: {
      getFieldsForWildcard: async (): Promise<FieldSpec[]> => {
        return [];
      },
    },
    search: {
      search: ({ params }: IKibanaSearchRequest, options?: ISearchOptions) => {
        return defer(() => {
          switch (options?.strategy) {
            case LOG_ENTRIES_SEARCH_STRATEGY:
              if (
                params.after?.time === params.endTimestamp ||
                params.before?.time === params.startTimestamp
              ) {
                return of<IKibanaSearchResponse<LogEntriesSearchResponsePayload>>({
                  id: 'MOCK_LOG_ENTRIES_RESPONSE',
                  total: 1,
                  loaded: 1,
                  isRunning: false,
                  isPartial: false,
                  rawResponse: ENTRIES_EMPTY,
                });
              } else {
                const entries = generateFakeEntries(
                  200,
                  params.startTimestamp,
                  params.endTimestamp,
                  params.columns || defaultLogViewAttributes.logColumns
                );
                return of<IKibanaSearchResponse<LogEntriesSearchResponsePayload>>({
                  id: 'MOCK_LOG_ENTRIES_RESPONSE',
                  total: 1,
                  loaded: 1,
                  isRunning: false,
                  isPartial: false,
                  rawResponse: {
                    data: {
                      entries,
                      topCursor: entries[0].cursor,
                      bottomCursor: entries[entries.length - 1].cursor,
                      hasMoreBefore: false,
                    },
                    errors: [],
                  },
                });
              }
            case undefined:
            case ES_SEARCH_STRATEGY:
            case ENHANCED_ES_SEARCH_STRATEGY:
              return of<IEsSearchResponse>({
                id: 'MOCK_INDEX_CHECK_RESPONSE',
                total: 1,
                loaded: 1,
                isRunning: false,
                isPartial: false,
                rawResponse: {
                  _shards: {
                    failed: 0,
                    successful: 1,
                    total: 1,
                  },
                  hits: {
                    hits: [],
                    total: 1,
                  },
                  timed_out: false,
                  took: 1,
                },
              });
            default:
              return of<IKibanaSearchResponse>({
                id: 'FAKE_RESPONSE',
                rawResponse: {},
              });
          }
        }).pipe(delay(2000));
      },
    },
  };

  const http = {
    get: async (path: string) => {
      switch (path) {
        case '/api/infra/log_views/default':
          return getLogViewResponsePayloadRT.encode({
            data: {
              id: 'default',
              origin: 'stored',
              attributes: defaultLogViewAttributes,
            },
          });
        default:
          return {};
      }
    },
  };

  const uiSettings = {
    get: (setting: string) => {
      switch (setting) {
        case 'dateFormat':
          return 'MMM D, YYYY @ HH:mm:ss.SSS';
        case 'dateFormat:scaled':
          return [['', 'HH:mm:ss.SSS']];
      }
    },
    get$: () => new Subject(),
  };

  return (
    <KibanaContextProvider services={{ data, http, uiSettings }}>
      {wrappedStory()}
    </KibanaContextProvider>
  );
};
