/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { XJsonMode } from '@kbn/ace';
export type { UseRequestConfig } from '../../../../src/plugins/es_ui_shared/public';
export { useRequest } from '../../../../src/plugins/es_ui_shared/public';
export {
  getSavedSearch,
  getSavedSearchUrlConflictMessage,
} from '../../../../src/plugins/discover/public';

export type {
  GetMlSharedImportsReturnType,
  UseIndexDataReturnType,
  EsSorting,
  RenderCellValue,
} from '../../ml/public';
export { getMlSharedImports, ES_CLIENT_TOTAL_HITS_RELATION } from '../../ml/public';

import { XJson } from '../../../../src/plugins/es_ui_shared/public';
const { expandLiteralStrings, collapseLiteralStrings } = XJson;
export { expandLiteralStrings, collapseLiteralStrings };
