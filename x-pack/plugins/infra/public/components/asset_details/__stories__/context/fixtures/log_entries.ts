/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import type {
  IKibanaSearchRequest,
  IKibanaSearchResponse,
  ISearchOptions,
} from '@kbn/data-plugin/public';
import { defaultLogViewAttributes } from '@kbn/logs-shared-plugin/common';
import {
  type LogEntriesSearchResponsePayload,
  LOG_ENTRIES_SEARCH_STRATEGY,
} from '../../../../../../common/search_strategies/log_entries/log_entries';
import { generateFakeEntries } from '../../../../../test_utils/entries';

export const getLogEntries = ({ params }: IKibanaSearchRequest, options?: ISearchOptions) => {
  switch (options?.strategy) {
    case LOG_ENTRIES_SEARCH_STRATEGY:
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

    default:
      return of({
        id: 'FAKE_RESPONSE',
        rawResponse: {},
      });
  }
};
