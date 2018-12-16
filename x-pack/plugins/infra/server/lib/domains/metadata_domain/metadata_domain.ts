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
    nodeName: string,
    nodeType: string
  ) {
    const sourceConfiguration = await this.libs.sources.getConfiguration(sourceId);
    const metricsPromise = this.adapter.getMetricMetadata(
      req,
      sourceConfiguration,
      nodeName,
      nodeType
    );
    const logsPromise = this.adapter.getLogMetadata(req, sourceConfiguration, nodeName, nodeType);

    const metrics = await metricsPromise;
    const logs = await logsPromise;

    const metricMetadata = pickMetadata(metrics).map(entry => {
      return { name: entry, source: 'metrics' };
    });

    const logMetadata = pickMetadata(logs).map(entry => {
      return { name: entry, source: 'logs' };
    });

    return metricMetadata.concat(logMetadata);
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
