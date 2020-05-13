/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ApplicationStart } from 'src/core/public';
import { GlobalSearchProviderResult, GlobalSearchResult } from '../../common/types';
import { NavigableGlobalSearchResult } from './types';
import { convertResultUrl, IBasePath } from '../../common/utils';

export type ResultProcessor = (
  providerResult: GlobalSearchProviderResult
) => NavigableGlobalSearchResult;

export const getResultProcessor = ({
  basePath,
  navigateToUrl,
}: {
  basePath: IBasePath;
  navigateToUrl: ApplicationStart['navigateToUrl'];
}) => (providerResult: GlobalSearchProviderResult): NavigableGlobalSearchResult => {
  const url = convertResultUrl(providerResult.url, basePath);
  return {
    ...providerResult,
    url,
    navigate: () => navigateToUrl(url),
  };
};

export const addNavigate = (
  result: GlobalSearchResult,
  navigateToUrl: ApplicationStart['navigateToUrl']
): NavigableGlobalSearchResult => {
  return {
    ...result,
    navigate: () => navigateToUrl(result.url),
  };
};
