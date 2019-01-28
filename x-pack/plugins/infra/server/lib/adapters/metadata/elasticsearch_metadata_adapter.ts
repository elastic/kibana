/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { first, get } from 'lodash';
import { InfraSourceConfiguration } from '../../sources';
import {
  InfraBackendFrameworkAdapter,
  InfraFrameworkRequest,
  InfraMetadataAggregationResponse,
} from '../framework';
import { NAME_FIELDS } from '../nodes/constants';
import { InfraMetadataAdapter, InfraMetricsAdapterResponse } from './adapter_types';

export class ElasticsearchMetadataAdapter implements InfraMetadataAdapter {
  private framework: InfraBackendFrameworkAdapter;
  constructor(framework: InfraBackendFrameworkAdapter) {
    this.framework = framework;
  }

  public async getMetricMetadata(
    req: InfraFrameworkRequest,
    sourceConfiguration: InfraSourceConfiguration,
    nodeId: string,
    nodeType: 'host' | 'container' | 'pod'
  ): Promise<InfraMetricsAdapterResponse> {
    const idFieldName = getIdFieldName(sourceConfiguration, nodeType);
    const metricQuery = {
      index: sourceConfiguration.metricAlias,
      body: {
        query: {
          bool: {
            filter: {
              term: { [idFieldName]: nodeId },
            },
          },
        },
        size: 1,
        _source: [NAME_FIELDS[nodeType]],
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

    const buckets =
      response.aggregations && response.aggregations.metrics
        ? response.aggregations.metrics.buckets
        : [];

    const sampleDoc = first(response.hits.hits);

    return {
      id: nodeId,
      name: get(sampleDoc, `_source.${NAME_FIELDS[nodeType]}`),
      buckets,
    };
  }

  public async getLogMetadata(
    req: InfraFrameworkRequest,
    sourceConfiguration: InfraSourceConfiguration,
    nodeId: string,
    nodeType: 'host' | 'container' | 'pod'
  ): Promise<InfraMetricsAdapterResponse> {
    const idFieldName = getIdFieldName(sourceConfiguration, nodeType);
    const logQuery = {
      index: sourceConfiguration.logAlias,
      body: {
        query: {
          bool: {
            filter: {
              term: { [idFieldName]: nodeId },
            },
          },
        },
        size: 1,
        _source: [NAME_FIELDS[nodeType]],
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

    const buckets =
      response.aggregations && response.aggregations.metrics
        ? response.aggregations.metrics.buckets
        : [];

    const sampleDoc = first(response.hits.hits);

    return {
      id: nodeId,
      name: get(sampleDoc, `_source.${NAME_FIELDS[nodeType]}`),
      buckets,
    };
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
