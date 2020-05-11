/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IBasePath } from 'src/core/server';
import { GlobalSearchProviderResultUrl } from '../result_provider';

export const convertResultUrl = (
  url: GlobalSearchProviderResultUrl,
  basePath: IBasePath
): string => {
  if (typeof url === 'string') {
    // relative path
    if (url.indexOf('/') === 0) {
      return basePath.prepend(url);
    }
    // absolute url
    return url;
  }
  if (url.prependBasePath) {
    return basePath.prepend(url.path);
  }
  return url.path;
};
