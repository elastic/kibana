/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertListState } from '../../types';

export const alertListData = (state: AlertListState) => state.alerts;

export const alertListPagination = (state: AlertListState) => {
  return {
    pageIndex: state.request_page_index,
    pageSize: state.request_page_size,
    resultFromIndex: state.result_from_index,
    total: state.total,
  };
};
