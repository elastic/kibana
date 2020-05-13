/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ApplicationStart } from 'src/core/public';
import { GlobalSearchResult } from '../../common/types';
import { NavigableGlobalSearchResult } from './types';

export const addNavigate = (
  result: GlobalSearchResult,
  navigateToUrl: ApplicationStart['navigateToUrl']
): NavigableGlobalSearchResult => {
  return {
    ...result,
    navigate: () => navigateToUrl(result.url),
  };
};
