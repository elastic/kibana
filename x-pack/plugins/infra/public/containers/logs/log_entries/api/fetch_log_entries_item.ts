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
  LOG_ENTRIES_ITEM_PATH,
  LogEntriesItemRequest,
  logEntriesItemRequestRT,
  logEntriesItemResponseRT,
} from '../../../../../common/http_api';

export const fetchLogEntriesItem = async (requestArgs: LogEntriesItemRequest) => {
  const response = await npStart.http.fetch(LOG_ENTRIES_ITEM_PATH, {
    method: 'POST',
    body: JSON.stringify(logEntriesItemRequestRT.encode(requestArgs)),
  });

  return pipe(
    logEntriesItemResponseRT.decode(response),
    fold(throwErrors(createPlainError), identity)
  );
};
