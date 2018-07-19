/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraResponse, QueryResolvers } from '../../../common/graphql/types';
import { InfraNodeRequestOptions, InfraNodeType } from '../../lib/adapters/nodes';
import { extractGroupByAndMetrics } from '../../lib/adapters/nodes/extract_group_by_and_metrics';
import { formatResponse } from '../../lib/adapters/nodes/format_response';
import { InfraBackendLibs, InfraContext } from '../../lib/infra_types';

export const createNodeResolvers = (libs: InfraBackendLibs) => {
  const resolverFn: QueryResolvers.MapResolver = async (
    parent,
    args,
    { req }: InfraContext,
    info
  ): Promise<InfraResponse> => {
    const { groupBy, metrics, nodeType, nodesKey } = extractGroupByAndMetrics(info);

    const options: InfraNodeRequestOptions = {
      filters: args.filters || [],
      groupBy,
      indexPattern: args.indexPattern,
      metrics,
      nodeType,
      nodesKey,
      timerange: args.timerange,
    };

    const response: InfraResponse = await libs.nodes.getNodes(req, options);
    return formatResponse(options, response);
  };

  return {
    InfraContainer: {
      __resolveType: (value: any): string => {
        if (value.type === InfraNodeType.container) {
          return 'InfraContainer';
        }
        return '';
      },
    },
    InfraHost: {
      __resolveType: (value: any): string => {
        if (value.type === InfraNodeType.host) {
          return 'InfraHost';
        }
        return '';
      },
    },
    InfraPod: {
      __resolveType: (value: any): string => {
        if (value.type === InfraNodeType.pod) {
          return 'InfraPod';
        }
        return '';
      },
    },
    Query: {
      map: resolverFn,
    },
  };
};
