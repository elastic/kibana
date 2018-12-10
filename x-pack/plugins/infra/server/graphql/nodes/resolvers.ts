/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraResponseResolvers, InfraSourceResolvers } from '../../../common/graphql/types';
import {
  InfraResolvedResult,
  InfraResolverOf,
  InfraResolverWithoutFields,
} from '../../lib/adapters/framework';
import { InfraNodeRequestOptions } from '../../lib/adapters/nodes';
import { extractGroupByAndNodeFromPath } from '../../lib/adapters/nodes/extract_group_by_and_node_from_path';
import { InfraNodesDomain } from '../../lib/domains/nodes_domain';
import { InfraContext } from '../../lib/infra_types';
import { UsageCollector } from '../../usage/usage_collector';
import { parseFilterQuery } from '../../utils/serialized_query';
import { QuerySourceResolver } from '../sources/resolvers';

type InfraSourceMapResolver = InfraResolverWithoutFields<
  InfraSourceResolvers.MapResolver,
  InfraResolvedResult<QuerySourceResolver>,
  InfraContext,
  'nodes'
>;

interface QueryMapResponse extends InfraSourceResolvers.MapArgs {
  source: InfraResolvedResult<QuerySourceResolver>;
}

type InfraNodesResolver = InfraResolverOf<
  InfraResponseResolvers.NodesResolver,
  QueryMapResponse,
  InfraContext
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
