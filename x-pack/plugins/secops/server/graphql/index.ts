/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { rootSchema } from '../../common/graphql/root/schema.gql';
import { getSourceQueryMock } from '../graphql/sources/source.mock';
import { getAllSourcesQueryMock } from '../graphql/sources/sources.mock';
import { Logger } from '../utils/logger';
import { sourcesSchema } from './sources/schema.gql';
import { whoAmISchema } from './who_am_i/schema.gql';

export const schemas = [rootSchema, sourcesSchema, whoAmISchema];

// The types from graphql-tools/src/mock.ts 'any' based. I add slightly
// stricter types here, but these should go away when graphql-tools using something
// other than "any" in the future for its types.
// https://github.com/apollographql/graphql-tools/blob/master/src/mock.ts#L406
export interface Context {
  req: {
    payload: {
      operationName: string;
    };
  };
}

export const createMocks = (logger: Logger) => ({
  Query: () => ({
    ...getAllSourcesQueryMock(logger),
    ...getSourceQueryMock(logger),
  }),
});
