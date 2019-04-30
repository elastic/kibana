/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraResponseResolvers, InfraSourceResolvers } from '../../graphql/types';
import { InfraNodeRequestOptions } from '../../lib/adapters/nodes';
import { extractGroupByAndNodeFromPath } from '../../lib/adapters/nodes/extract_group_by_and_node_from_path';
import { InfraNodesDomain } from '../../lib/domains/nodes_domain';
import { UsageCollector } from '../../usage/usage_collector';
import { parseFilterQuery } from '../../utils/serialized_query';
import { ChildResolverOf, InfraResolverOf, ResultOf } from '../../utils/typed_resolvers';
import { QuerySourceResolver } from '../sources/resolvers';

type InfraSourceMapResolver = ChildResolverOf<
  InfraResolverOf<
    InfraSourceResolvers.MapResolver<
      {
        source: ResultOf<QuerySourceResolver>;
      } & InfraSourceResolvers.MapArgs
    >
  >,
  QuerySourceResolver
>;

type InfraNodesResolver = ChildResolverOf<
  InfraResolverOf<InfraResponseResolvers.NodesResolver>,
  InfraSourceMapResolver
>;

interface NodesResolversDeps {
  nodes: InfraNodesDomain;
}

export const createNodeResolvers = (
  libs: NodesResolversDeps
): {
  InfraSource: {
    map: InfraSourceMapResolver;
  };
  InfraResponse: {
    nodes: InfraNodesResolver;
  };
} => ({
  InfraSource: {
    async map(source, args) {
      return {
        source,
        timerange: args.timerange,
        filterQuery: args.filterQuery,
      };
    },
  },
  InfraResponse: {
    async nodes(mapResponse, args, { req }) {
      const { source, timerange, filterQuery } = mapResponse;
      const { groupBy, nodeType } = extractGroupByAndNodeFromPath(args.path);
      UsageCollector.countNode(nodeType);
      const options: InfraNodeRequestOptions = {
        filterQuery: parseFilterQuery(filterQuery),
        nodeType,
        groupBy,
        sourceConfiguration: source.configuration,
        metric: args.metric,
        timerange,
      };

      return await libs.nodes.getNodes(req, options);
    },
  },
});
