/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SourceResolvers } from '../../graphql/types';
import { AppResolverOf, ChildResolverOf } from '../../lib/framework';
import { NetworkTopNFlow } from '../../lib/network_top_n_flow';
import { createOptions } from '../../utils/build_query/create_options';
import { QuerySourceResolver } from '../sources/resolvers';

type QueryNetworkTopNFlowResolver = ChildResolverOf<
  AppResolverOf<SourceResolvers.NetworkTopNFlowResolver>,
  QuerySourceResolver
>;

export interface NetworkTopNFlowResolversDeps {
  networkTopNFlow: NetworkTopNFlow;
}

export const createNetworkTopNFlowResolvers = (
  libs: NetworkTopNFlowResolversDeps
): {
  Source: {
    NetworkTopNFlow: QueryNetworkTopNFlowResolver;
  };
} => ({
  Source: {
    async NetworkTopNFlow(source, args, { req }, info) {
      const options = { ...createOptions(source, args, info), networkTopNFlowType: args.type };
      return libs.networkTopNFlow.getNetworkTopNFlow(req, options);
    },
  },
});
