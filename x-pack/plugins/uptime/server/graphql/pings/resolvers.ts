/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMResolver } from '../../../../../legacy/plugins/uptime/common/graphql/resolver_types';
import {
  AllPingsQueryArgs,
  PingResults,
} from '../../../../../legacy/plugins/uptime/common/graphql/types';
import { UMServerLibs } from '../../lib/lib';
import { UMContext } from '../types';
import { CreateUMGraphQLResolvers } from '../types';
import { savedObjectsAdapter } from '../../lib/saved_objects';

export type UMAllPingsResolver = UMResolver<
  PingResults | Promise<PingResults>,
  any,
  AllPingsQueryArgs,
  UMContext
>;

export interface UMPingResolver {
  allPings: () => PingResults;
}

export const createPingsResolvers: CreateUMGraphQLResolvers = (
  libs: UMServerLibs
): {
  Query: {
    allPings: UMAllPingsResolver;
  };
} => ({
  Query: {
    async allPings(
      _resolver,
      { monitorId, sort, size, status, dateRangeStart, dateRangeEnd, location, page },
      { APICaller, savedObjectsClient }
    ): Promise<PingResults> {
      const dynamicSettings = await savedObjectsAdapter.getUptimeDynamicSettings(
        savedObjectsClient
      );

      return await libs.requests.getPings({
        callES: APICaller,
        dynamicSettings,
        dateRangeStart,
        dateRangeEnd,
        monitorId,
        status,
        sort,
        size,
        location,
        page,
      });
    },
  },
});
