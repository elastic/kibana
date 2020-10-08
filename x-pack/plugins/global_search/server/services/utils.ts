/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import type { IBasePath, KibanaRequest } from 'src/core/server';
import type { IBasePath as BasePathAccessor } from '../../common/utils';

export const getRequestBasePath = (
  request: KibanaRequest,
  basePath: IBasePath
): BasePathAccessor => {
  const requestBasePath = basePath.get(request);
  return {
    prepend: (path) => {
      return `${requestBasePath}/${path}`.replace(/\/{2,}/g, '/');
    },
  };
};
