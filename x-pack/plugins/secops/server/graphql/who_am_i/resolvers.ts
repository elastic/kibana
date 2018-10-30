/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SourceResolvers } from '../../../common/graphql/types';
import { AppResolvedResult, AppResolverOf } from '../../lib/framework';
import { Context } from '../../lib/types';
import { QuerySourceResolver } from '../sources/resolvers';

export type QueryWhoAmIResolver = AppResolverOf<
  SourceResolvers.WhoAmIResolver,
  AppResolvedResult<QuerySourceResolver>,
  Context
>;

export const createWhoAmIResolvers = (): {
  Source: {
    whoAmI: QueryWhoAmIResolver;
  };
} => ({
  Source: {
    async whoAmI(root, args) {
      return {
        appName: 'Sec Ops',
      };
    },
  },
});
