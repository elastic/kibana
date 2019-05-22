/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SourceResolvers } from '../../graphql/types';
import { AppResolverOf, ChildResolverOf } from '../../lib/framework';
import { Network } from '../../lib/network';
import { createOptions } from '../../utils/build_query/create_options';
import { QuerySourceResolver } from '../sources/resolvers';

type QueryNetworkTopNFlowResolver = ChildResolverOf<
  AppResolverOf<SourceResolvers.NetworkTopNFlowResolver>,
  QuerySourceResolver
>;

type QueryDnsResolver = ChildResolverOf<
  AppResolverOf<SourceResolvers.NetworkDnsResolver>,
  QuerySourceResolver
>;

export interface NetworkResolversDeps {
  network: Network;
}

export const createNetworkResolvers = (
  libs: NetworkResolversDeps
): {
  Source: {
    NetworkTopNFlow: QueryNetworkTopNFlowResolver;
    NetworkDns: QueryDnsResolver;
  };
} => ({
  Source: {
    async NetworkTopNFlow(source, args, { req }, info) {
      const options = {
        ...createOptions(source, args, info),
        flowTarget: args.flowTarget,
        networkTopNFlowSort: args.sort,
        flowDirection: args.flowDirection,
      };
      return libs.network.getNetworkTopNFlow(req, options);
    },
    async NetworkDns(source, args, { req }, info) {
      const options = {
        ...createOptions(source, args, info),
        networkDnsSortField: args.sort,
        isPtrIncluded: args.isPtrIncluded,
      };
      return libs.network.getNetworkDns(req, options);
    },
  },
});
