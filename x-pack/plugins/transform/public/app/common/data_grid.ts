/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiDataGridStyle } from '@elastic/eui';

import { PivotQuery } from './request';
import { PreviewRequestBody } from './transform';

export const INIT_MAX_COLUMNS = 20;

export const euiDataGridStyle: EuiDataGridStyle = {
  border: 'all',
  fontSize: 's',
  cellPadding: 's',
  stripes: false,
  rowHover: 'highlight',
  header: 'shade',
};

export const euiDataGridToolbarSettings = {
  showColumnSelector: true,
  showStyleSelector: false,
  showSortSelector: true,
  showFullScreenSelector: false,
};

export const getPivotPreviewDevConsoleStatement = (request: PreviewRequestBody) => {
  return `POST _transform/_preview\n${JSON.stringify(request, null, 2)}\n`;
};

export const getIndexDevConsoleStatement = (query: PivotQuery, indexPatternTitle: string) => {
  return `GET ${indexPatternTitle}/_search\n${JSON.stringify(
    {
      query,
    },
    null,
    2
  )}\n`;
};
