/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GraphQLResolveInfo } from 'graphql';
import gql from 'graphql-tag';
import { InfraResponse } from '../../common/types';
import {
  InfraBackendLibs,
  InfraNodeRequestOptions,
  InfraNodeType,
  InfraResolverFn,
} from '../lib/infra_types';
import { extractGroupByAndMetrics } from '../utils/extract_group_by_and_metrics';
import { formatResponse } from '../utils/format_response';

export const nodesSchema: any = gql`
  type InfraHostMetrics {
    count: Int
  }

  type InfraHost {
    name: String
    type: String
    metrics: InfraHostMetrics
  }

  type InfraPodMetrics {
    count: Int
  }

  type InfraPod {
    name: String
    type: String
    metrics: InfraPodMetrics
  }

  type InfraContainerMetrics {
    count: Int
  }

  type InfraContainer {
    name: String
    type: String
    metrics: InfraContainerMetrics
  }

  type InfraServiceMetrics {
    count: Int
  }

  type InfraService {
    name: String
    type: String
    metrics: InfraServiceMetrics
  }

  type InfraGroup {
    name: String!
    groups(
      type: InfraGroupByType!
      field: String
      filters: [InfraGroupByFilter]
    ): [InfraGroup!]
    hosts: [InfraHost!]
    pods: [InfraPod!]
    containers: [InfraContainer!]
    services: [InfraService!]
  }

  type InfraResponse {
    groups(
      type: InfraGroupByType!
      field: String
      filters: [InfraGroupByFilter]
    ): [InfraGroup!]
    hosts: [InfraHost!]
    pods: [InfraPod!]
    containers: [InfraContainer!]
    services: [InfraService!]
  }

  extend type Query {
    map(
      indexPattern: InfraIndexPattern!
      timerange: InfraTimerange!
      filters: [InfraFilter]
    ): InfraResponse
  }
`;

export const createNodeResolvers = (libs: InfraBackendLibs) => {
  const resolverFn: InfraResolverFn<InfraResponse> = async (
    src: any,
    args: any,
    ctx: any,
    info: GraphQLResolveInfo
  ): Promise<InfraResponse> => {
    const { groupBy, metrics, nodeType, nodesKey } = extractGroupByAndMetrics(
      info
    );

    const options: InfraNodeRequestOptions = {
      filters: args.filters || [],
      groupBy,
      indexPattern: args.indexPattern,
      metrics,
      nodeType,
      nodesKey,
      timerange: args.timerange,
    };

    const response: InfraResponse = await libs.nodes.getNodes(ctx.req, options);
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
