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

interface UMGetMonitorsArgs {
  dateRangeStart: number;
  dateRangeEnd: number;
  filters: string;
}

export type UMGetMonitorsResolver = UMResolver<
  any | Promise<any>,
  any,
  UMGetMonitorsArgs,
  UMContext
>;

export type UMLatestMonitorsResolver = UMResolver<
  Ping[] | Promise<Ping[]>,
  any,
  UMLatestMonitorsArgs,
  UMContext
>;

interface GetSnapshotArgs {
  dateRangeStart: number;
  dateRangeEnd: number;
  downCount: number;
  windowSize: number;
  filters?: string;
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

interface UMGetFilterBarArgs {
  dateRangeStart: number;
  dateRangeEnd: number;
}

export type UMGetFilterBarResolver = UMResolver<
  any | Promise<any>,
  any,
  UMGetFilterBarArgs,
  UMContext
>;

interface UMGetErrorsList {
  dateRangeStart: number;
  dateRangeEnd: number;
  filters?: string;
}

export type UMGetErrorsListResolver = UMResolver<
  any | Promise<any>,
  any,
  UMGetErrorsList,
  UMContext
>;

export const createMonitorsResolvers: CreateUMGraphQLResolvers = (
  libs: UMServerLibs
): {
  Query: {
    getMonitors: UMGetMonitorsResolver;
    getSnapshot: UMSnapshotResolver;
    getMonitorChartsData: UMGetMonitorChartsResolver;
    getLatestMonitors: UMLatestMonitorsResolver;
    getFilterBar: UMGetFilterBarResolver;
    getErrorsList: UMGetErrorsListResolver;
  };
} => ({
  Query: {
    // @ts-ignore TODO update typings and remove this comment
    async getMonitors(resolver, { dateRangeStart, dateRangeEnd, filters }, { req }): Promise<any> {
      const result = await libs.monitors.getMonitors(req, dateRangeStart, dateRangeEnd, filters);
      return {
        monitors: result,
      };
    },
    async getSnapshot(
      resolver,
      { dateRangeStart, dateRangeEnd, downCount, windowSize, filters },
      { req }
    ): Promise<any> {
      const { up, down, trouble } = await libs.monitors.getSnapshotCount(
        req,
        { dateRangeStart, dateRangeEnd },
        downCount,
        windowSize,
        filters
      );

      return {
        up,
        down,
        // @ts-ignore TODO update typings and remove this comment
        trouble,
        total: up + down + trouble,
        histogram: await libs.pings.getHist(req, { dateRangeStart, dateRangeEnd }, filters),
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
    async getFilterBar(resolver, { dateRangeStart, dateRangeEnd }, { req }): Promise<any> {
      return libs.monitors.getFilterBar(req, dateRangeStart, dateRangeEnd);
    },
    async getErrorsList(
      resolver,
      { dateRangeStart, dateRangeEnd, filters },
      { req }
    ): Promise<any> {
      return libs.monitors.getErrorsList(req, dateRangeStart, dateRangeEnd, filters);
    },
  },
});
