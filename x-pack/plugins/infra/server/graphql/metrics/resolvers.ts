/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraSourceResolvers } from '../../../common/graphql/types';
import { InfraResolvedResult, InfraResolverOf } from '../../lib/adapters/framework';
import { InfraMetricsDomain } from '../../lib/domains/metrics_domain';
import { InfraContext } from '../../lib/infra_types';
import { UsageCollector } from '../../usage/usage_collector';
import { QuerySourceResolver } from '../sources/resolvers';

type InfraSourceMetricsResolver = InfraResolverOf<
  InfraSourceResolvers.MetricsResolver,
  InfraResolvedResult<QuerySourceResolver>,
  InfraContext
>;

interface ResolverDeps {
  metrics: InfraMetricsDomain;
}

export const createMetricResolvers = (
  libs: ResolverDeps
): {
  InfraSource: {
    metrics: InfraSourceMetricsResolver;
  };
} => ({
  InfraSource: {
    async metrics(source, args, { req }) {
      UsageCollector.countNode(args.nodeType);
      const options = {
        nodeId: args.nodeId,
        nodeType: args.nodeType,
        timerange: args.timerange,
        metrics: args.metrics,
        sourceConfiguration: source.configuration,
      };
      return libs.metrics.getMetrics(req, options);
    },
  },
});
