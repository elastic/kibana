/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandlerContext } from 'src/core/server';

export const createRouteContext = (client: any) => {
  return ({
    core: {
      savedObjects: {
        client,
      },
    },
  } as unknown) as RequestHandlerContext;
};
