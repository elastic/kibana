/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SourceResolvers } from '../../graphql/types';
import { AppResolverOf, ChildResolverOf } from '../../lib/framework';
import { IpOverview } from '../../lib/ip_overview';
import { createOptions } from '../../utils/build_query/create_options';
import { QuerySourceResolver } from '../sources/resolvers';

export type QueryIpOverviewResolver = ChildResolverOf<
  AppResolverOf<SourceResolvers.IpOverviewResolver>,
  QuerySourceResolver
>;

export interface IpOverviewResolversDeps {
  ipOverview: IpOverview;
}

export const createIpOverviewResolvers = (
  libs: IpOverviewResolversDeps
): {
  Source: {
    IpOverview: QueryIpOverviewResolver;
  };
} => ({
  Source: {
    async IpOverview(source, args, { req }, info) {
      const options = { ...createOptions(source, args, info), ip: args.ip };
      return libs.ipOverview.getIpOverview(req, options);
    },
  },
});
