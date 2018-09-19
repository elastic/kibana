/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// import { InfraResponse } from '../../../common/graphql/types';
import { InfraCapabilitiesAdapter } from '../../adapters/capabilities';
import { InfraFrameworkRequest } from '../../adapters/framework';
import { InfraSources } from '../../sources';

export class InfraCapabilitiesDomain {
  constructor(
    private readonly adapter: InfraCapabilitiesAdapter,
    private readonly libs: { sources: InfraSources }
  ) {}

  public async getCapabilities(req: InfraFrameworkRequest, sourceId: string, nodeName: string) {
    const sourceConfiguration = await this.libs.sources.getConfiguration(sourceId);
    const metricsPromise = this.adapter.getMetricCapabilities(req, sourceConfiguration, nodeName);
    const logsPromise = this.adapter.getLogCapabilities(req, sourceConfiguration, nodeName);

    const metrics = await metricsPromise;
    const logs = await logsPromise;

    const metricCapabilities = pickCapabilities(metrics).map(metricCapability => {
      return { name: metricCapability, source: 'metrics' };
    });

    const logCapabilities = pickCapabilities(logs).map(logCapability => {
      return { name: logCapability, source: 'logs' };
    });

    return metricCapabilities.concat(logCapabilities);
  }
}

const pickCapabilities = (response: any) => {
  const capabilities = response.aggregations.metrics.buckets
    .map(module => {
      return module.names.buckets.map(name => {
        return `${module.key}.${name.key}`;
      });
    })
    .reduce((a: any, b: any) => a.concat(b));
  return capabilities;
};
