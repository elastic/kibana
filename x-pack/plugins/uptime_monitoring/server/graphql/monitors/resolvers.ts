/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMGqlRange } from '../../../common/domain_types';
import { UMResolver } from '../../../common/graphql/resolver_types';
import { Ping, Snapshot } from '../../../common/graphql/types';
import { UMServerLibs } from '../../lib/lib';
import { CreateUMGraphQLResolvers, UMContext } from '../types';

export type UMSnapshotResolver = UMResolver<
  Snapshot | Promise<Snapshot>,
  any,
  GetSnapshotArgs,
  UMContext
>;

export type UMMonitorsResolver = UMResolver<any | Promise<any>, any, UMGqlRange, UMContext>;

interface UMLatestMonitorsArgs {
  dateRangeStart: number;
  dateRangeEnd: number;
  monitorId?: string;
}

export type UMLatestMonitorsResolver = UMResolver<
  Ping[] | Promise<Ping[]>,
  any,
  UMLatestMonitorsArgs,
  UMContext
>;

interface GetSnapshotArgs {
  start: number;
  end: number;
  downCount: number;
  windowSize: number;
}

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

export const createMonitorsResolvers: CreateUMGraphQLResolvers = (
  libs: UMServerLibs
): {
  Query: {
    getMonitors: any;
    getSnapshot: UMSnapshotResolver;
    getMonitorChartsData: UMGetMonitorChartsResolver;
    getLatestMonitors: UMLatestMonitorsResolver;
  };
} => ({
  Query: {
    // @ts-ignore TODO update typings and remove this comment
    async getMonitors(resolver, args, { req }): Promise<any> {
      const result = await libs.monitors.getLatestMonitors(req, args);
      return {
        monitors: result,
      };
    },
    async getSnapshot(resolver, args, { req }): Promise<any> {
      const { start, end, downCount, windowSize } = args;
      const { up, down, trouble } = await libs.monitors.getSnapshotCount(
        req,
        { start, end },
        downCount,
        windowSize
      );

      return {
        up,
        down,
        // @ts-ignore TODO update typings and remove this comment
        trouble,
        total: up + down + trouble,
        histogram: await libs.pings.getHist(req, { start, end }),
      };
    },
    async getMonitorChartsData(
      resolver,
      { monitorId, dateRangeStart, dateRangeEnd },
      { req }
    ): Promise<any> {
      return libs.monitors.getMonitorChartsData(req, monitorId, dateRangeStart, dateRangeEnd);
    },
    async getLatestMonitors(
      resolver,
      { dateRangeStart, dateRangeEnd, monitorId },
      { req }
    ): Promise<Ping[]> {
      return libs.pings.getLatestMonitorDocs(req, dateRangeStart, dateRangeEnd, monitorId);
    },
  },
});
