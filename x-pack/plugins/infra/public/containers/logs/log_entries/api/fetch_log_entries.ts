/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import { identity } from 'fp-ts/lib/function';
import { npStart } from '../../../../legacy_singletons';

import { throwErrors, createPlainError } from '../../../../../common/runtime_types';

import {
  LOG_ENTRIES_PATH,
  LogEntriesRequest,
  logEntriesRequestRT,
  logEntriesResponseRT,
} from '../../../../../common/http_api';

export const fetchLogEntries = async (requestArgs: LogEntriesRequest) => {
  const response = await npStart.http.fetch(LOG_ENTRIES_PATH, {
    method: 'POST',
    body: JSON.stringify(logEntriesRequestRT.encode(requestArgs)),
  });

  return pipe(logEntriesResponseRT.decode(response), fold(throwErrors(createPlainError), identity));
};
