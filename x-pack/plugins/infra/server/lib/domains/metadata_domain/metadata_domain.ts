/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { JsonObject } from '../../../../common/typed_json';
import {
  InfraFrameworkRequest,
  InfraMetadataAggregationBucket,
  InfraServiceMetadataLogsBucket,
  InfraServiceMetadataMetricsBucket,
} from '../../adapters/framework';
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

  public async getServiceMetadata(
    req: InfraFrameworkRequest,
    sourceId: string,
    start: number,
    end: number,
    filterQuery?: ServiceMetadataQuery
  ) {
    const sourceConfiguration = await this.libs.sources.getConfiguration(sourceId);

    const metricsPromise = this.adapter.getMetricsMetadataForServices(
      req,
      sourceConfiguration,
      start,
      end,
      filterQuery
    );

    const logsPromise = this.adapter.getLogsMetadataForServices(
      req,
      sourceConfiguration,
      start,
      end,
      filterQuery
    );

    const metrics = await metricsPromise;
    const logs = await logsPromise;

    return collectServiceMetadata(metrics, logs);
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

const collectServiceMetadata = (
  metrics: InfraServiceMetadataMetricsBucket[],
  logs: InfraServiceMetadataLogsBucket[]
): object[] => {
  const metricsMetaData: MetricsMetaData = metrics.reduce((data: MetricsMetaData, m) => {
    const metaData = {
      hosts: m.nodes.buckets.hosts.doc_count > 0 ? true : false,
      pods: m.nodes.buckets.pods.doc_count > 0 ? true : false,
      containers: m.nodes.buckets.containers.doc_count > 0 ? true : false,
    };
    data[m.key] = metaData;
    return data;
  }, {});

  const logsMetaData: LogsMetaData = logs.reduce((data: LogsMetaData, l) => {
    data[l.key] = {
      logs: l.doc_count > 0 ? true : false, // if it was 0 there shouldn't be a bucket for it, but who knows.
    };
    return data;
  }, {});

  const keys = _.union(Object.keys(metricsMetaData), Object.keys(logsMetaData));

  const result: any = [];

  keys.forEach(key => {
    let data = { name: key, hosts: false, pods: false, containers: false, logs: false };
    if (metricsMetaData[key]) {
      data = { ...data, ...metricsMetaData[key] };
    }
    if (logsMetaData[key]) {
      data = { ...data, ...logsMetaData[key] };
    }
    result.push(data);
  });

  return result;
};

interface MetricsMetaData {
  [key: string]: {
    hosts: boolean;
    pods: boolean;
    containers: boolean;
  };
}

interface LogsMetaData {
  [key: string]: { logs: boolean };
}

export type ServiceMetadataQuery = JsonObject;
