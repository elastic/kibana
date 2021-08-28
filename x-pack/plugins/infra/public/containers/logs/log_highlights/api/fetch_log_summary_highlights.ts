/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpHandler } from '../../../../../../../../src/core/public/http/types';
import type { LogEntriesSummaryHighlightsRequest } from '../../../../../common/http_api/log_entries/summary_highlights';
import {
  logEntriesSummaryHighlightsRequestRT,
  logEntriesSummaryHighlightsResponseRT,
  LOG_ENTRIES_SUMMARY_HIGHLIGHTS_PATH,
} from '../../../../../common/http_api/log_entries/summary_highlights';
import { decodeOrThrow } from '../../../../../common/runtime_types';

export const fetchLogSummaryHighlights = async (
  requestArgs: LogEntriesSummaryHighlightsRequest,
  fetch: HttpHandler
) => {
  const response = await fetch(LOG_ENTRIES_SUMMARY_HIGHLIGHTS_PATH, {
    method: 'POST',
    body: JSON.stringify(logEntriesSummaryHighlightsRequestRT.encode(requestArgs)),
  });

  return decodeOrThrow(logEntriesSummaryHighlightsResponseRT)(response);
};
