/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { XJsonMode } from '@kbn/ace';
export type { UseRequestConfig } from '@kbn/es-ui-shared-plugin/public';
export { useRequest } from '@kbn/es-ui-shared-plugin/public';
export { getSavedSearch, getSavedSearchUrlConflictMessage } from '@kbn/discover-plugin/public';

export type {
  GetMlSharedImportsReturnType,
  UseIndexDataReturnType,
  EsSorting,
  RenderCellValue,
} from '@kbn/ml-plugin/public';
export { getMlSharedImports, ES_CLIENT_TOTAL_HITS_RELATION } from '@kbn/ml-plugin/public';

import { XJson } from '@kbn/es-ui-shared-plugin/public';
const { expandLiteralStrings, collapseLiteralStrings } = XJson;
export { expandLiteralStrings, collapseLiteralStrings };
