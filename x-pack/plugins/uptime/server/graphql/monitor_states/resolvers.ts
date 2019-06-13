/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CreateUMGraphQLResolvers, UMContext } from '../types';
import { UMServerLibs } from '../../lib/lib';
import { UMResolver } from '../../../common/graphql/resolver_types';
import { MonitorSummary } from '../../../common/graphql/types';

export type UMGetMonitorStatesResolver = UMResolver<
  MonitorSummary[] | Promise<MonitorSummary[]>,
  any,
  any,
  UMContext
>;

export const createMonitorStatesResolvers: CreateUMGraphQLResolvers = (
  libs: UMServerLibs
): {
  Query: { getMonitorStates: UMGetMonitorStatesResolver };
} => {
  return {
    Query: {
      async getMonitorStates(resolver, params, { req }): Promise<MonitorSummary[]> {
        return await libs.monitorStates.getMonitorStates(req);
      },
    },
  };
};
