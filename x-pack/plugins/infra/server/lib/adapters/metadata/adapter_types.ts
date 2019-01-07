/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ServiceMetadataQuery } from '../../domains/metadata_domain';
import { InfraSourceConfiguration } from '../../sources';
import {
  InfraFrameworkRequest,
  InfraMetadataAggregationBucket,
  InfraServiceMetadataLogsBucket,
  InfraServiceMetadataMetricsBucket,
} from '../framework';

export interface InfraMetricsAdapterResponse {
  id: string;
  name?: string;
  buckets: InfraMetadataAggregationBucket[];
}

export interface InfraMetadataAdapter {
  getMetricMetadata(
    req: InfraFrameworkRequest,
    sourceConfiguration: InfraSourceConfiguration,
    nodeId: string,
    nodeType: string
  ): Promise<InfraMetricsAdapterResponse>;
  getLogMetadata(
    req: InfraFrameworkRequest,
    sourceConfiguration: InfraSourceConfiguration,
    nodeId: string,
    nodeType: string
  ): Promise<InfraMetricsAdapterResponse>;
  getMetricsMetadataForServices(
    req: InfraFrameworkRequest,
    sourceConfiguration: InfraSourceConfiguration,
    start: number,
    end: number,
    filterQuery?: ServiceMetadataQuery
  ): Promise<InfraServiceMetadataMetricsBucket[]>;
  getLogsMetadataForServices(
    req: InfraFrameworkRequest,
    sourceConfiguration: InfraSourceConfiguration,
    start: number,
    end: number,
    filterQuery?: ServiceMetadataQuery
  ): Promise<InfraServiceMetadataLogsBucket[]>;
}
