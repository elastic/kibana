/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SourceResolvers } from '../../graphql/types';
import { AppResolverOf, ChildResolverOf } from '../../lib/framework';
import { Overview } from '../../lib/overview';
import { createOptions } from '../../utils/build_query/create_options';
import { QuerySourceResolver } from '../sources/resolvers';

export type QueryOverviewNetworkResolver = ChildResolverOf<
  AppResolverOf<SourceResolvers.OverviewNetworkResolver>,
  QuerySourceResolver
>;

export type QueryOverviewHostResolver = ChildResolverOf<
  AppResolverOf<SourceResolvers.OverviewHostResolver>,
  QuerySourceResolver
>;

export interface OverviewResolversDeps {
  overview: Overview;
}

export const createOverviewResolvers = (
  libs: OverviewResolversDeps
): {
  Source: {
    OverviewHost: QueryOverviewHostResolver;
    OverviewNetwork: QueryOverviewNetworkResolver;
  };
} => ({
  Source: {
    async OverviewNetwork(source, args, { req }, info) {
      const options = { ...createOptions(source, args, info) };
      return libs.overview.getOverviewNetwork(req, options);
    },
    async OverviewHost(source, args, { req }, info) {
      const options = { ...createOptions(source, args, info) };
      return libs.overview.getOverviewHost(req, options);
    },
  },
});
