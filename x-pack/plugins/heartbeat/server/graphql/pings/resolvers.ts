/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HBResolver } from 'x-pack/plugins/heartbeat/common/graphql/resolver_types';
import { Ping } from 'x-pack/plugins/heartbeat/common/graphql/types';
import { HBPingSortDirectionArg } from '../../../common/domain_types';
import { HBServerLibs } from '../../lib/lib';
import { IHBContext } from '../types';
import { ICreateHeartbeatGraphQLResolvers } from '../types';

interface AllPingsArgs {
  sort: HBPingSortDirectionArg;
  size: number;
}

export type HBAllPingsResolver = HBResolver<
  Ping[] | Promise<Ping[]>,
  any,
  AllPingsArgs,
  IHBContext
>;

export interface HBPingResolver {
  allPings: () => Ping[];
}

export const createPingsResolvers: ICreateHeartbeatGraphQLResolvers = (
  libs: HBServerLibs
): {
  Query: {
    allPings: HBAllPingsResolver;
  };
} => ({
  Query: {
    async allPings(resolver, { sort, size }, { req }): Promise<Ping[]> {
      return libs.pings.getAll(req, sort, size);
    },
  },
});
