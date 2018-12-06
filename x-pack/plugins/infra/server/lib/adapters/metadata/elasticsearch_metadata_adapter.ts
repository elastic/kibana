/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraSourceConfiguration } from '../../sources';
import {
  InfraBackendFrameworkAdapter,
  InfraFrameworkRequest,
  InfraMetadataAggregationBucket,
  InfraMetadataAggregationResponse,
} from '../framework';
import { InfraMetadataAdapter } from './adapter_types';

export class ElasticsearchMetadataAdapter implements InfraMetadataAdapter {
  private framework: InfraBackendFrameworkAdapter;
  constructor(framework: InfraBackendFrameworkAdapter) {
    this.framework = framework;
  }

  public async getMetricMetadata(
    req: InfraFrameworkRequest,
    sourceConfiguration: InfraSourceConfiguration,
    nodeName: string,
    nodeType: 'host' | 'container' | 'pod'
  ): Promise<InfraMetadataAggregationBucket[]> {
    const idFieldName = getIdFieldName(sourceConfiguration, nodeType);
    const metricQuery = {
      index: sourceConfiguration.metricAlias,
      body: {
        query: {
          bool: {
            filter: {
              term: { [idFieldName]: nodeName },
            },
          },
        },
        size: 0,
        aggs: {
          metrics: {
            terms: {
              field: 'metricset.module',
              size: 1000,
            },
            aggs: {
              names: {
                terms: {
                  field: 'metricset.name',
                  size: 1000,
                },
              },
            },
          },
        },
      },
    };

    const response = await this.framework.callWithRequest<
      any,
      { metrics?: InfraMetadataAggregationResponse }
    >(req, 'search', metricQuery);

    return response.aggregations && response.aggregations.metrics
      ? response.aggregations.metrics.buckets
      : [];
  }

  public async getLogMetadata(
    req: InfraFrameworkRequest,
    sourceConfiguration: InfraSourceConfiguration,
    nodeName: string,
    nodeType: 'host' | 'container' | 'pod'
  ): Promise<InfraMetadataAggregationBucket[]> {
    const idFieldName = getIdFieldName(sourceConfiguration, nodeType);
    const logQuery = {
      index: sourceConfiguration.logAlias,
      body: {
        query: {
          bool: {
            filter: {
              term: { [idFieldName]: nodeName },
            },
          },
        },
        size: 0,
        aggs: {
          metrics: {
            terms: {
              field: 'fileset.module',
              size: 1000,
            },
            aggs: {
              names: {
                terms: {
                  field: 'fileset.name',
                  size: 1000,
                },
              },
            },
          },
        },
      },
    };

    const response = await this.framework.callWithRequest<
      any,
      { metrics?: InfraMetadataAggregationResponse }
    >(req, 'search', logQuery);

    return response.aggregations && response.aggregations.metrics
      ? response.aggregations.metrics.buckets
      : [];
  }
}

const getIdFieldName = (sourceConfiguration: InfraSourceConfiguration, nodeType: string) => {
  switch (nodeType) {
    case 'host':
      return sourceConfiguration.fields.host;
    case 'container':
      return sourceConfiguration.fields.container;
    default:
      return sourceConfiguration.fields.pod;
  }
};
