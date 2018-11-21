/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMPingSortDirectionArg } from '../../../common/domain_types';
import { UMResolver } from '../../../common/graphql/resolver_types';
import { Ping } from '../../../common/graphql/types';
import { UMServerLibs } from '../../lib/lib';
import { UMContext } from '../types';
import { CreateUMGraphQLResolvers } from '../types';

interface UMAllPingsArgs {
  sort: UMPingSortDirectionArg;
  size: number;
}

export type UMAllPingsResolver = UMResolver<
  Ping[] | Promise<Ping[]>,
  any,
  UMAllPingsArgs,
  UMContext
>;

export interface UMPingResolver {
  allPings: () => Ping[];
}

export const createPingsResolvers: CreateUMGraphQLResolvers = (
  libs: UMServerLibs
): {
  Query: {
    allPings: UMAllPingsResolver;
  };
} => ({
  Query: {
    async allPings(resolver, { sort, size }, { req }): Promise<Ping[]> {
      return libs.pings.getAll(req, sort, size);
    },
  },
});
