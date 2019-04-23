/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Query } from 'react-apollo';

import {
  InfraSnapshotMetricInput,
  InfraSnapshotNode,
  InfraNodeType,
  InfraSnapshotGroupbyInput,
  InfraTimerangeInput,
  WaffleNodesQuery,
} from '../../graphql/types';
import { waffleNodesQuery } from './waffle_nodes.gql_query';

interface WithWaffleNodesArgs {
  nodes: InfraSnapshotNode[];
  loading: boolean;
  refetch: () => void;
}

interface WithWaffleNodesProps {
  children: (args: WithWaffleNodesArgs) => React.ReactNode;
  filterQuery: string | null | undefined;
  metric: InfraSnapshotMetricInput;
  groupBy: InfraSnapshotGroupbyInput[];
  nodeType: InfraNodeType;
  sourceId: string;
  timerange: InfraTimerangeInput;
}

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
      groupBy: [...groupBy],
      type: nodeType,
      timerange,
      filterQuery,
    }}
  >
    {({ data, loading, refetch }) =>
      children({
        loading,
        nodes:
          data && data.source && data.source.snapshot && data.source.snapshot.nodes
            ? data.source.snapshot.nodes
            : [],
        refetch,
      })
    }
  </Query>
);
