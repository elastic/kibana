/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraFrameworkRequest, InfraMetadataAggregationBucket } from '../../adapters/framework';
import { InfraMetadataAdapter } from '../../adapters/metadata';
import { InfraSources } from '../../sources';

export class InfraMetadataDomain {
  constructor(
    private readonly adapter: InfraMetadataAdapter,
    private readonly libs: { sources: InfraSources }
  ) {}

  public async getMetadata(
    req: InfraFrameworkRequest,
    sourceId: string,
    nodeId: string,
    nodeType: string
  ) {
    const { configuration } = await this.libs.sources.getSourceConfiguration(req, sourceId);
    const metricsPromise = this.adapter.getMetricMetadata(req, configuration, nodeId, nodeType);
    const logsPromise = this.adapter.getLogMetadata(req, configuration, nodeId, nodeType);

    const metrics = await metricsPromise;
    const logs = await logsPromise;

    const metricMetadata = pickMetadata(metrics.buckets).map(entry => {
      return { name: entry, source: 'metrics' };
    });

    const logMetadata = pickMetadata(logs.buckets).map(entry => {
      return { name: entry, source: 'logs' };
    });

    const id = metrics.id || logs.id;
    const name = metrics.name || logs.name || id;
    return { id, name, features: metricMetadata.concat(logMetadata) };
  }
}

const pickMetadata = (buckets: InfraMetadataAggregationBucket[]): string[] => {
  if (buckets) {
    const metadata = buckets
      .map(module => {
        if (module.names) {
          return module.names.buckets.map(name => {
            return `${module.key}.${name.key}`;
          });
        } else {
          return [];
        }
      })
      .reduce((a: string[], b: string[]) => a.concat(b), []);
    return metadata;
  } else {
    return [];
  }
};
