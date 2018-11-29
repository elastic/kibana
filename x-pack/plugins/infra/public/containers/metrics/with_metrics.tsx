/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Query } from 'react-apollo';
import {
  InfraMetric,
  InfraMetricData,
  InfraNodeType,
  InfraTimerangeInput,
  MetricsQuery,
} from '../../../common/graphql/types';
import { InfraMetricLayout } from '../../pages/metrics/layouts/types';
import { metricsQuery } from './metrics.gql_query';

interface WithMetricsArgs {
  metrics: InfraMetricData[];
  error?: string | undefined;
  loading: boolean;
}

interface WithMetricsProps {
  children: (args: WithMetricsArgs) => React.ReactNode;
  layouts: InfraMetricLayout[];
  nodeType: InfraNodeType;
  nodeId: string;
  sourceId: string;
  timerange: InfraTimerangeInput;
}

export const WithMetrics = ({
  children,
  layouts,
  sourceId,
  timerange,
  nodeType,
  nodeId,
}: WithMetricsProps) => {
  const metrics = layouts.reduce(
    (acc, item) => {
      return acc.concat(item.sections.map(s => s.id));
    },
    [] as InfraMetric[]
  );

  return (
    <Query<MetricsQuery.Query, MetricsQuery.Variables>
      query={metricsQuery}
      fetchPolicy="no-cache"
      variables={{
        sourceId,
        metrics,
        nodeType,
        nodeId,
        timerange,
      }}
    >
      {({ data, error, loading }) => {
        return children({
          metrics: filterOnlyInfraMetricData(data && data.source && data.source.metrics),
          error: error && error.message,
          loading,
        });
      }}
    </Query>
  );
};

const filterOnlyInfraMetricData = (
  metrics: Array<MetricsQuery.Metrics | null> | undefined
): InfraMetricData[] => {
  if (!metrics) {
    return [];
  }
  return metrics.filter(m => m !== null).map(m => m as InfraMetricData);
};
