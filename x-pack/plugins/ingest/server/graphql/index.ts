/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { rootSchema } from '../../common/graphql/root/schema.gql';
import { sharedSchema } from '../../common/graphql/shared/schema.gql';
import { Logger } from '../utils/logger';
import { capabilitiesSchema } from './capabilities/schema.gql';
import { logEntriesSchema } from './log_entries/schema.gql';
import { metricsSchema } from './metrics/schema.gql';
import { nodesSchema } from './nodes/schema.gql';
import { sourceStatusSchema } from './source_status/schema.gql';
import { sourcesSchema } from './sources/schema.gql';

import logEntriesMock from './log_entries/logentries.mock';
import logSummaryMock from './log_entries/logsummary.mock';
import waffleNodesQueryMock from './nodes/wafflenodesquery.mock';
import sourceQueryMock from './sources/sourcequery.mock';

import { GraphQLResolveInfo } from 'graphql';

export const schemas = [
  rootSchema,
  sharedSchema,
  capabilitiesSchema,
  logEntriesSchema,
  nodesSchema,
  sourcesSchema,
  sourceStatusSchema,
  metricsSchema,
];

// These types are derived directly from mock.ts from graphql-tools/src/mock.ts. They are aliased
// here in case graphql-tools using something other than "any" in the future for its types.
// https://github.com/apollographql/graphql-tools/blob/master/src/mock.ts#L406
interface Args {
  [key: string]: any;
}
type Context = any;
type Root = any;

export const createMocks = (logger: Logger) => ({
  Query: () => ({
    source: (root: Root, args: Args, context: Context) => {
      const operationName = context.req.payload.operationName.toLowerCase();
      switch (operationName) {
        case 'sourcequery': {
          logger.info('Using mock for sourcequery');
          return sourceQueryMock;
        }
        case 'wafflenodesquery': {
          logger.info('Using mock for wafflenodesquery');
          return waffleNodesQueryMock;
        }
        case 'logsummary': {
          logger.info('Using mock for logsummary');
          return logSummaryMock;
        }
        case 'logentries': {
          logger.info('Using mock for logentries');
          return logEntriesMock;
        }
        default: {
          logger.error(`Could not find a mock for: ${operationName}`);
          return null;
        }
      }
    },
  }),
});
