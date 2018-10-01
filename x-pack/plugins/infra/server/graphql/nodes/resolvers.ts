/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraSourceResolvers } from '../../../common/graphql/types';
import { InfraResolvedResult, InfraResolverOf } from '../../lib/adapters/framework';
import { InfraNodeRequestOptions } from '../../lib/adapters/nodes';
import { extractGroupByAndNodeFromPath } from '../../lib/adapters/nodes/extract_group_by_and_node_from_path';
import { extractPathsAndMetrics } from '../../lib/adapters/nodes/extract_paths_and_metrics';
import { InfraNodesDomain } from '../../lib/domains/nodes_domain';
import { InfraContext } from '../../lib/infra_types';
import { UsageCollector } from '../../usage/usage_collector';
import { parseFilterQuery } from '../../utils/serialized_query';
import { QuerySourceResolver } from '../sources/resolvers';

type InfraSourceMapResolver = InfraResolverOf<
  InfraSourceResolvers.MapResolver,
  InfraResolvedResult<QuerySourceResolver>,
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
} => ({
  InfraSource: {
    async map(source, args, { req }, info) {
      const { metrics, path } = extractPathsAndMetrics(info);
      const { groupBy, nodeType } = extractGroupByAndNodeFromPath(path);
      UsageCollector.countNode(nodeType);
      const options: InfraNodeRequestOptions = {
        filterQuery: parseFilterQuery(args.filterQuery),
        nodeType,
        groupBy,
        sourceConfiguration: source.configuration,
        metrics,
        timerange: args.timerange,
      };

      return await libs.nodes.getNodes(req, options);
    },
  },
});
