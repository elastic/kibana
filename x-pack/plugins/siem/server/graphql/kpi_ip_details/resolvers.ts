/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SourceResolvers } from '../../graphql/types';
import { AppResolverOf, ChildResolverOf } from '../../lib/framework';
import { KpiIpDetails } from '../../lib/kpi_ip_details';
import { createOptions } from '../../utils/build_query/create_options';
import { QuerySourceResolver } from '../sources/resolvers';

export type QueryKipIpDetailsResolver = ChildResolverOf<
  AppResolverOf<SourceResolvers.KpiIpDetailsResolver>,
  QuerySourceResolver
>;

export interface KpiIpDetailsResolversDeps {
  kpiIpDetails: KpiIpDetails;
}

export const createKpiIpDetailsResolvers = (
  libs: KpiIpDetailsResolversDeps
): {
  Source: {
    KpiIpDetails: QueryKipIpDetailsResolver;
  };
} => ({
  Source: {
    async KpiIpDetails(source, args, { req }, info) {
      const options = { ...createOptions(source, args, info), ip: args.ip };
      return libs.kpiIpDetails.getKpiIpDetails(req, options);
    },
  },
});
