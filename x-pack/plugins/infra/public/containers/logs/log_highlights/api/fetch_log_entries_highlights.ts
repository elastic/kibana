/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';

import { decodeOrThrow } from '../../../../../common/runtime_types';

import {
  LOG_ENTRIES_HIGHLIGHTS_PATH,
  LogEntriesHighlightsRequest,
  logEntriesHighlightsRequestRT,
  logEntriesHighlightsResponseRT,
} from '../../../../../common/http_api';

export const fetchLogEntriesHighlights = async (
  requestArgs: LogEntriesHighlightsRequest,
  fetch: HttpHandler
) => {
  const response = await fetch(LOG_ENTRIES_HIGHLIGHTS_PATH, {
    method: 'POST',
    body: JSON.stringify(logEntriesHighlightsRequestRT.encode(requestArgs)),
  });

  return decodeOrThrow(logEntriesHighlightsResponseRT)(response);
};
