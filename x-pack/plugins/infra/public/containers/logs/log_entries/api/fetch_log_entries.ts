/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import type { HttpHandler } from 'src/core/public';

import { decodeOrThrow } from '../../../../../common/runtime_types';

import {
  LOG_ENTRIES_PATH,
  LogEntriesRequest,
  logEntriesRequestRT,
  logEntriesResponseRT,
} from '../../../../../common/http_api';

export const fetchLogEntries = async (requestArgs: LogEntriesRequest, fetch: HttpHandler) => {
  const response = await fetch(LOG_ENTRIES_PATH, {
    method: 'POST',
    body: JSON.stringify(logEntriesRequestRT.encode(requestArgs)),
  });

  return decodeOrThrow(logEntriesResponseRT)(response);
};
