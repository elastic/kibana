/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMResolver } from '../../../common/graphql/resolver_types';
import { UMServerLibs } from '../../lib/lib';
import { CreateUMGraphQLResolvers, UMContext } from '../types';

interface UMMonitorChartsArgs {
  dateRangeStart: number;
  dateRangeEnd: number;
  monitorId: string;
}

export type UMGetMonitorChartsResolver = UMResolver<
  any | Promise<any>,
  any,
  UMMonitorChartsArgs,
  UMContext
>;

export interface UMMonitorResolver {
  getMonitorChartsData: () => any;
}

export const createMonitorsResolvers: CreateUMGraphQLResolvers = (
  libs: UMServerLibs
): {
  Query: {
    getMonitorChartsData: UMGetMonitorChartsResolver;
  };
} => ({
  Query: {
    async getMonitorChartsData(
      resolver,
      { monitorId, dateRangeStart, dateRangeEnd },
      { req }
    ): Promise<any> {
      return libs.monitors.getMonitorChartsData(req, monitorId, dateRangeStart, dateRangeEnd);
    },
  },
});
