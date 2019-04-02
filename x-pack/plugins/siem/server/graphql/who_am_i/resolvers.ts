/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SourceResolvers } from '../../graphql/types';
import { AppResolverOf, ChildResolverOf } from '../../lib/framework';
import { QuerySourceResolver } from '../sources/resolvers';

export type QueryWhoAmIResolver = ChildResolverOf<
  AppResolverOf<SourceResolvers.WhoAmIResolver>,
  QuerySourceResolver
>;

export const createWhoAmIResolvers = (): {
  Source: {
    whoAmI: QueryWhoAmIResolver;
  };
} => ({
  Source: {
    async whoAmI(root, args) {
      return {
        appName: 'SIEM',
      };
    },
  },
});
