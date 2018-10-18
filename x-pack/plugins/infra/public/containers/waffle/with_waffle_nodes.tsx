/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Query } from 'react-apollo';

import {
  InfraMetricInput,
  InfraPathInput,
  InfraPathType,
  InfraTimerangeInput,
  WaffleNodesQuery,
} from '../../../common/graphql/types';
import { InfraNodeType } from '../../../server/lib/adapters/nodes';
import { InfraWaffleMapGroup } from '../../lib/lib';
import { nodesToWaffleMap } from './nodes_to_wafflemap';
import { waffleNodesQuery } from './waffle_nodes.gql_query';

interface WithWaffleNodesArgs {
  nodes: InfraWaffleMapGroup[];
  loading: boolean;
  refetch: () => void;
}

interface WithWaffleNodesProps {
  children: (args: WithWaffleNodesArgs) => React.ReactNode;
  filterQuery: string | null | undefined;
  metric: InfraMetricInput;
  groupBy: InfraPathInput[];
  nodeType: InfraNodeType;
  sourceId: string;
  timerange: InfraTimerangeInput;
}

const NODE_TYPE_TO_PATH_TYPE = {
  [InfraNodeType.container]: InfraPathType.containers,
  [InfraNodeType.host]: InfraPathType.hosts,
  [InfraNodeType.pod]: InfraPathType.pods,
};

export const WithWaffleNodes = ({
  children,
  filterQuery,
  metric,
  groupBy,
  nodeType,
  sourceId,
  timerange,
}: WithWaffleNodesProps) => (
  <Query<WaffleNodesQuery.Query, WaffleNodesQuery.Variables>
    query={waffleNodesQuery}
    fetchPolicy="no-cache"
    notifyOnNetworkStatusChange
    variables={{
      sourceId,
      metric,
      path: [...groupBy, { type: NODE_TYPE_TO_PATH_TYPE[nodeType] }],
      timerange,
      filterQuery,
    }}
  >
    {({ data, loading, refetch }) =>
      children({
        loading,
        nodes:
          data && data.source && data.source.map && data.source.map.nodes
            ? nodesToWaffleMap(data.source.map.nodes)
            : [],
        refetch,
      })
    }
  </Query>
);
