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
  InfraTimerangeInput,
  WaffleNodesQuery,
} from '../../../common/graphql/types';
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
  metrics: InfraMetricInput[];
  path: InfraPathInput[];
  sourceId: string;
  timerange: InfraTimerangeInput;
}

export const WithWaffleNodes = ({
  children,
  filterQuery,
  metrics,
  path,
  sourceId,
  timerange,
}: WithWaffleNodesProps) => (
  <Query<WaffleNodesQuery.Query, WaffleNodesQuery.Variables>
    query={waffleNodesQuery}
    fetchPolicy="no-cache"
    notifyOnNetworkStatusChange
    variables={{
      sourceId,
      metrics,
      path,
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
