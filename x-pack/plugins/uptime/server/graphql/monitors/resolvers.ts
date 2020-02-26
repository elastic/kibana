/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMGqlRange } from '../../../../../legacy/plugins/uptime/common/domain_types';
import { UMResolver } from '../../../../../legacy/plugins/uptime/common/graphql/resolver_types';
import {
  GetMonitorChartsDataQueryArgs,
  MonitorChart,
} from '../../../../../legacy/plugins/uptime/common/graphql/types';
import { UMServerLibs } from '../../lib/lib';
import { CreateUMGraphQLResolvers, UMContext } from '../types';
import { savedObjectsAdapter } from '../../lib/adapters/saved_objects/kibana_saved_objects_adapter';

export type UMMonitorsResolver = UMResolver<any | Promise<any>, any, UMGqlRange, UMContext>;

export type UMGetMonitorChartsResolver = UMResolver<
  any | Promise<any>,
  any,
  GetMonitorChartsDataQueryArgs,
  UMContext
>;

export const createMonitorsResolvers: CreateUMGraphQLResolvers = (
  libs: UMServerLibs
): {
  Query: {
    getMonitorChartsData: UMGetMonitorChartsResolver;
  };
} => ({
  Query: {
    async getMonitorChartsData(
      _resolver,
      { monitorId, dateRangeStart, dateRangeEnd, location },
      { APICaller, savedObjectsClient }
    ): Promise<MonitorChart> {
      const dynamicSettings = await savedObjectsAdapter.getUptimeDynamicSettings(savedObjectsClient, undefined);
      return await libs.requests.getMonitorCharts({
        callES: APICaller,
        dynamicSettings,
        monitorId,
        dateRangeStart,
        dateRangeEnd,
        location,
      });
    },
  },
});
