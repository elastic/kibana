/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMResolver } from '../../../common/graphql/resolver_types';
import { Ping } from '../../../common/graphql/types';
import { UMServerLibs } from '../../lib/lib';
import { UMContext } from '../types';
import { CreateUMGraphQLResolvers } from '../types';

interface UMLatestMonitorsArgs {
  dateRangeStart: number;
  dateRangeEnd: number;
}

export type UMLatestMonitorsResolver = UMResolver<
  Ping[] | Promise<Ping[]>,
  any,
  UMLatestMonitorsArgs,
  UMContext
>;

export interface UMGetLatestMonitorsResolver {
  getLatestMonitors: () => Ping[];
}

export const createLatestMonitorsResolvers: CreateUMGraphQLResolvers = (
  libs: UMServerLibs
): {
  Query: {
    getLatestMonitors: UMLatestMonitorsResolver;
  };
} => ({
  Query: {
    async getLatestMonitors(resolver, { dateRangeStart, dateRangeEnd }, { req }): Promise<Ping[]> {
      return libs.pings.getLatestMonitorDocs(req, dateRangeStart, dateRangeEnd);
    },
  },
});
