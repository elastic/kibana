/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CursorPagination } from './types';
import { CursorDirection, SortOrder } from '../../../../common/runtime_types';
import { QueryContext } from './query_context';
import { getUptimeESMockClient } from '../helper';

export const nextPagination = (key: any): CursorPagination => {
  return {
    cursorDirection: CursorDirection.AFTER,
    sortOrder: SortOrder.ASC,
    cursorKey: key,
  };
};
export const simpleQueryContext = (): QueryContext => {
  return new QueryContext(
    getUptimeESMockClient().uptimeEsClient,
    '',
    '',
    nextPagination('something'),
    undefined,
    0,
    ''
  );
};
