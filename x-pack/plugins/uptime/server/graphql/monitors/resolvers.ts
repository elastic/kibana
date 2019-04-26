/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMGqlRange } from '../../../common/domain_types';
import { UMResolver } from '../../../common/graphql/resolver_types';
import {
  FilterBar,
  GetErrorsListQueryArgs,
  GetFilterBarQueryArgs,
  GetLatestMonitorsQueryArgs,
  GetMonitorChartsDataQueryArgs,
  GetMonitorCountQueryArgs,
  GetMonitorPageTitleQueryArgs,
  GetMonitorsQueryArgs,
  GetMonitorTableQueryArgs,
  GetSnapshotQueryArgs,
  MonitorChart,
  MonitorPageTitle,
  Ping,
  Snapshot,
} from '../../../common/graphql/types';
import { UMServerLibs } from '../../lib/lib';
import { CreateUMGraphQLResolvers, UMContext } from '../types';

export type UMSnapshotResolver = UMResolver<
  Snapshot | Promise<Snapshot>,
  any,
  GetSnapshotQueryArgs,
  UMContext
>;

export type UMMonitorsResolver = UMResolver<any | Promise<any>, any, UMGqlRange, UMContext>;

export type UMGetMonitorsResolver = UMResolver<
  any | Promise<any>,
  any,
  GetMonitorsQueryArgs,
  UMContext
>;

export type UMLatestMonitorsResolver = UMResolver<
  Ping[] | Promise<Ping[]>,
  any,
  GetLatestMonitorsQueryArgs,
  UMContext
>;

export type UMGetMonitorChartsResolver = UMResolver<
  any | Promise<any>,
  any,
  GetMonitorChartsDataQueryArgs,
  UMContext
>;

export type UMGetFilterBarResolver = UMResolver<
  any | Promise<any>,
  any,
  GetFilterBarQueryArgs,
  UMContext
>;

export type UMGetErrorsListResolver = UMResolver<
  any | Promise<any>,
  any,
  GetErrorsListQueryArgs,
  UMContext
>;

export type UMGetMontiorPageTitleResolver = UMResolver<
  MonitorPageTitle | Promise<MonitorPageTitle | null> | null,
  any,
  GetMonitorPageTitleQueryArgs,
  UMContext
>;

export type UMGetMonitorCountResolver = UMResolver<
  number | Promise<number>,
  any,
  GetMonitorCountQueryArgs,
  UMContext
>;

export type UMGetMonitorTableResolver = UMResolver<
  any | Promise<any>,
  any,
  GetMonitorTableQueryArgs,
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
    getMonitorPageTitle: UMGetMontiorPageTitleResolver;
    getMonitorCount: UMGetMonitorCountResolver;
    getMonitorTable: UMGetMonitorTableResolver;
  };
} => ({
  Query: {
    // @ts-ignore TODO update typings and remove this comment
    async getMonitors(
      resolver,
      { dateRangeStart, dateRangeEnd, size, filters },
      { req }
    ): Promise<any> {
      const result = await libs.monitors.getMonitors(
        req,
        dateRangeStart,
        dateRangeEnd,
        size,
        undefined,
        filters
      );
      return {
        monitors: result,
      };
    },
    async getSnapshot(resolver, { dateRangeStart, dateRangeEnd, filters }, { req }): Promise<any> {
      const { up, down, total } = await libs.monitors.getSnapshotCount(
        req,
        dateRangeStart,
        dateRangeEnd,
        filters
      );

      return {
        up,
        down,
        total,
        histogram: await libs.pings.getPingHistogram(req, dateRangeStart, dateRangeEnd, filters),
      };
    },
    async getMonitorChartsData(
      resolver,
      { monitorId, dateRangeStart, dateRangeEnd },
      { req }
    ): Promise<MonitorChart> {
      return await libs.monitors.getMonitorChartsData(req, monitorId, dateRangeStart, dateRangeEnd);
    },
    async getLatestMonitors(
      resolver,
      { dateRangeStart, dateRangeEnd, monitorId },
      { req }
    ): Promise<Ping[]> {
      return libs.pings.getLatestMonitorDocs(req, dateRangeStart, dateRangeEnd, monitorId);
    },
    async getFilterBar(resolver, { dateRangeStart, dateRangeEnd }, { req }): Promise<FilterBar> {
      return libs.monitors.getFilterBar(req, dateRangeStart, dateRangeEnd);
    },
    async getErrorsList(
      resolver,
      { dateRangeStart, dateRangeEnd, filters },
      { req }
    ): Promise<any> {
      return libs.monitors.getErrorsList(req, dateRangeStart, dateRangeEnd, filters);
    },
    async getMonitorCount(
      resolver,
      { dateRangeStart, dateRangeEnd, filters },
      { req }
    ): Promise<number> {
      return await libs.monitors.getMonitorIdCount(req, dateRangeStart, dateRangeEnd, filters);
    },
    async getMonitorPageTitle(
      resolver: any,
      { monitorId },
      { req }
    ): Promise<MonitorPageTitle | null> {
      return await libs.monitors.getMonitorPageTitle(req, monitorId);
    },
    async getMonitorTable(
      resolver: any,
      { dateRangeStart, dateRangeEnd, page, size, filters },
      { req }
    ): Promise<any> {
      const [pages, items, monitorIdCount] = await Promise.all([
        libs.monitors.getMonitorTablePages(
          req,
          dateRangeStart,
          dateRangeEnd,
          size,
          filters || undefined
        ),
        libs.monitors.getMonitors(
          req,
          dateRangeStart,
          dateRangeEnd,
          size,
          page || undefined,
          filters
        ),
        libs.monitors.getMonitorIdCount(req, dateRangeStart, dateRangeEnd, filters),
      ]);
      return {
        pages,
        items,
        monitorIdCount,
      };
    },
  },
});
