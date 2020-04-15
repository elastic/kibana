/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandlerContext, CallAPIOptions, SavedObjectsClient } from 'src/core/server';
import { UMServerLibs } from '../lib/lib';

export type UMContext = RequestHandlerContext & {
  APICaller: (
    endpoint: string,
    clientParams?: Record<string, any>,
    options?: CallAPIOptions | undefined
  ) => Promise<any>;
  savedObjectsClient: SavedObjectsClient;
};

export interface UMGraphQLResolver {
  Query?: any;
}

export type CreateUMGraphQLResolvers = (libs: UMServerLibs) => any;
