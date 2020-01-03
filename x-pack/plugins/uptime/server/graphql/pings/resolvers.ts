/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMResolver } from '../../../../../legacy/plugins/uptime/common/graphql/resolver_types';
import {
  AllPingsQueryArgs,
  DocCount,
  PingResults,
} from '../../../../../legacy/plugins/uptime/common/graphql/types';
import { UMServerLibs } from '../../lib/lib';
import { UMContext } from '../types';
import { CreateUMGraphQLResolvers } from '../types';

export type UMAllPingsResolver = UMResolver<
  PingResults | Promise<PingResults>,
  any,
  AllPingsQueryArgs,
  UMContext
>;

export type UMGetDocCountResolver = UMResolver<DocCount | Promise<DocCount>, any, never, UMContext>;

export interface UMPingResolver {
  allPings: () => PingResults;
  getDocCount: () => number;
}

export const createPingsResolvers: CreateUMGraphQLResolvers = (
  libs: UMServerLibs
): {
  Query: {
    allPings: UMAllPingsResolver;
    getDocCount: UMGetDocCountResolver;
  };
} => ({
  Query: {
    async allPings(
      _resolver,
      { monitorId, sort, size, status, dateRangeStart, dateRangeEnd, location },
      { APICaller }
    ): Promise<PingResults> {
      return await libs.pings.getAll({
        callES: APICaller,
        dateRangeStart,
        dateRangeEnd,
        monitorId,
        status,
        sort,
        size,
        location,
      });
    },
    async getDocCount(_resolver, _args, { APICaller }): Promise<DocCount> {
      return libs.pings.getDocCount({ callES: APICaller });
    },
  },
});
