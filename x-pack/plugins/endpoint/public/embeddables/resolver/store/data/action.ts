/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface ServerReturnedResolverData {
  readonly type: 'serverReturnedResolverData';
  // TODO how dare you
  readonly payload: Record<string, any>;
}

export type DataAction = ServerReturnedResolverData;
