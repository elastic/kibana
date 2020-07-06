/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// actual mocks
export const expandLiteralStrings = jest.fn();
export const XJsonMode = jest.fn();
export const useRequest = jest.fn(() => ({
  isLoading: false,
  error: null,
  data: undefined,
}));

// just passing through the reimports
export {
  getErrorMessage,
  getDataGridSchemaFromKibanaFieldType,
  getFieldsFromKibanaIndexPattern,
  multiColumnSortFactory,
  useDataGrid,
  useRenderCellValue,
  DataGrid,
  EsSorting,
  RenderCellValue,
  SearchResponse7,
  UseDataGridReturnType,
  UseIndexDataReturnType,
  INDEX_STATUS,
} from '../../../ml/public';
