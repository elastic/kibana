/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CursorPagination } from '../../adapter_types';
import { CursorDirection, SortOrder } from '../../../../../../common';
import { QueryContext } from '../../elasticsearch_monitor_states_adapter';

export const prevPagination = (key: any): CursorPagination => {
  return {
    cursorDirection: CursorDirection.BEFORE,
    sortOrder: SortOrder.ASC,
    cursorKey: key,
  };
};
export const nextPagination = (key: any): CursorPagination => {
  return {
    cursorDirection: CursorDirection.AFTER,
    sortOrder: SortOrder.ASC,
    cursorKey: key,
  };
};
export const simpleQueryContext = (): QueryContext => {
  return {
    count: _query => new Promise(r => ({})),
    search: _query => new Promise(r => ({})),
    dateRangeEnd: '',
    dateRangeStart: '',
    filterClause: undefined,
    pagination: nextPagination('something'),
    size: 0,
    statusFilter: '',
  };
};
