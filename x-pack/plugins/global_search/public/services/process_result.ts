/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ApplicationStart } from 'src/core/public';
import { GlobalSearchProviderResult } from '../../common/types';
import { GlobalSearchResult } from './types';
import { convertResultUrl, IBasePath } from '../../common/utils';

export type ResultProcessor = (providerResult: GlobalSearchProviderResult) => GlobalSearchResult;

export const getResultProcessor = ({
  basePath,
  navigateToUrl,
}: {
  basePath: IBasePath;
  navigateToUrl: ApplicationStart['navigateToUrl'];
}) => (providerResult: GlobalSearchProviderResult): GlobalSearchResult => {
  const url = convertResultUrl(providerResult.url, basePath);
  return {
    ...providerResult,
    url,
    navigate: () => navigateToUrl(url),
  };
};
