/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TagsRequestHandlerConrtext {}

declare module 'src/core/server' {
  interface RequestHandlerContext {
    tags?: TagsRequestHandlerConrtext;
  }
}
