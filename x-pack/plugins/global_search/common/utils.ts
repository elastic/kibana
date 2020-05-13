/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GlobalSearchProviderResultUrl } from './types';

// interface matching both the server and client-side implementation of IBasePath for our needs
// used to avoid duplicating `convertResultUrl` in server and client code
export interface IBasePath {
  prepend(path: string): string;
}

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
