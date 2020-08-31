/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GlobalSearchProviderResult, GlobalSearchResult } from './types';
import { convertResultUrl, IBasePath } from './utils';

/**
 * Convert a {@link GlobalSearchProviderResult | provider result}
 * to a {@link GlobalSearchResult | service result}
 */
export const processProviderResult = (
  result: GlobalSearchProviderResult,
  basePath: IBasePath
): GlobalSearchResult => {
  return {
    ...result,
    url: convertResultUrl(result.url, basePath),
  };
};
