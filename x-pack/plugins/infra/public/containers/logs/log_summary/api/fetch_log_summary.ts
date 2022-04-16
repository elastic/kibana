/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import { decodeOrThrow } from '../../../../../common/runtime_types';

import {
  LOG_ENTRIES_SUMMARY_PATH,
  LogEntriesSummaryRequest,
  logEntriesSummaryRequestRT,
  logEntriesSummaryResponseRT,
} from '../../../../../common/http_api';

export const fetchLogSummary = async (
  requestArgs: LogEntriesSummaryRequest,
  fetch: HttpHandler
) => {
  const response = await fetch(LOG_ENTRIES_SUMMARY_PATH, {
    method: 'POST',
    body: JSON.stringify(logEntriesSummaryRequestRT.encode(requestArgs)),
  });

  return decodeOrThrow(logEntriesSummaryResponseRT)(response);
};
