/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { XJsonMode } from '@kbn/ace';

export type { GetMlSharedImportsReturnType } from '@kbn/ml-plugin/public';
export { getMlSharedImports } from '@kbn/ml-plugin/public';

import { XJson } from '@kbn/es-ui-shared-plugin/public';
const { expandLiteralStrings, collapseLiteralStrings } = XJson;
export { expandLiteralStrings, collapseLiteralStrings };
