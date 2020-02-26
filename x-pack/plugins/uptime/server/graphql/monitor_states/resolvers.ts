/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CreateUMGraphQLResolvers, UMContext } from '../types';
import { UMServerLibs } from '../../lib/lib';
import { UMResolver } from '../../../../../legacy/plugins/uptime/common/graphql/resolver_types';
import {
  GetMonitorStatesQueryArgs,
  MonitorSummaryResult,
  StatesIndexStatus,
} from '../../../../../legacy/plugins/uptime/common/graphql/types';
import { CONTEXT_DEFAULTS } from '../../../../../legacy/plugins/uptime/common/constants/context_defaults';
import { savedObjectsAdapter } from '../../lib/adapters/saved_objects/kibana_saved_objects_adapter';

export type UMGetMonitorStatesResolver = UMResolver<
  MonitorSummaryResult | Promise<MonitorSummaryResult>,
  any,
  GetMonitorStatesQueryArgs,
  UMContext
>;

export type UMStatesIndexExistsResolver = UMResolver<
  StatesIndexStatus | Promise<StatesIndexStatus>,
  any,
  {},
  UMContext
>;

export const createMonitorStatesResolvers: CreateUMGraphQLResolvers = (
  libs: UMServerLibs
): {
  Query: {
    getMonitorStates: UMGetMonitorStatesResolver;
    getStatesIndexStatus: UMStatesIndexExistsResolver;
  };
} => {
  return {
    Query: {
      async getMonitorStates(
        _resolver,
        { dateRangeStart, dateRangeEnd, filters, pagination, statusFilter },
        { APICaller, savedObjectsClient }
      ): Promise<MonitorSummaryResult> {

        const dynamicSettings = await savedObjectsAdapter.getUptimeDynamicSettings(savedObjectsClient, undefined);

        const decodedPagination = pagination
          ? JSON.parse(decodeURIComponent(pagination))
          : CONTEXT_DEFAULTS.CURSOR_PAGINATION;
        const [
          indexStatus,
          { summaries, nextPagePagination, prevPagePagination },
        ] = await Promise.all([
          libs.requests.getIndexStatus({ callES: APICaller, dynamicSettings }),
          libs.requests.getMonitorStates({
            callES: APICaller,
            dynamicSettings,
            dateRangeStart,
            dateRangeEnd,
            pagination: decodedPagination,
            filters,
            // this is added to make typescript happy,
            // this sort of reassignment used to be further downstream but I've moved it here
            // because this code is going to be decomissioned soon
            statusFilter: statusFilter || undefined,
          }),
        ]);

        const totalSummaryCount = indexStatus?.docCount ?? { count: undefined };

        return {
          summaries,
          nextPagePagination,
          prevPagePagination,
          totalSummaryCount,
        };
      },
      async getStatesIndexStatus(_resolver, {}, { APICaller, savedObjectsClient }): Promise<StatesIndexStatus> {
        const dynamicSettings = await savedObjectsAdapter.getUptimeDynamicSettings(savedObjectsClient, undefined);
        return await libs.requests.getIndexStatus({ callES: APICaller, dynamicSettings });
      },
    },
  };
};
