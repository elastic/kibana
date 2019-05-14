/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { failure } from 'io-ts/lib/PathReporter';

import { InfraSourceResolvers } from '../../graphql/types';
import { InfraMetricsDomain } from '../../lib/domains/metrics_domain';
import { SourceConfigurationRuntimeType } from '../../lib/sources';
import { UsageCollector } from '../../usage/usage_collector';
import { ChildResolverOf, InfraResolverOf } from '../../utils/typed_resolvers';
import { QuerySourceResolver } from '../sources/resolvers';

type InfraSourceMetricsResolver = ChildResolverOf<
  InfraResolverOf<InfraSourceResolvers.MetricsResolver>,
  QuerySourceResolver
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
      const sourceConfiguration = SourceConfigurationRuntimeType.decode(
        source.configuration
      ).getOrElseL(errors => {
        throw new Error(failure(errors).join('\n'));
      });

      UsageCollector.countNode(args.nodeType);
      const options = {
        nodeId: args.nodeId,
        nodeType: args.nodeType,
        timerange: args.timerange,
        metrics: args.metrics,
        sourceConfiguration,
      };
      return libs.metrics.getMetrics(req, options);
    },
  },
});
