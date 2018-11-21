/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraSourceConfiguration } from '../../sources';
import { InfraFrameworkRequest, InfraMetadataAggregationBucket } from '../framework';

export interface InfraMetadataAdapter {
  getMetricMetadata(
    req: InfraFrameworkRequest,
    sourceConfiguration: InfraSourceConfiguration,
    nodeName: string,
    nodeType: string
  ): Promise<InfraMetadataAggregationBucket[]>;
  getLogMetadata(
    req: InfraFrameworkRequest,
    sourceConfiguration: InfraSourceConfiguration,
    nodeName: string,
    nodeType: string
  ): Promise<InfraMetadataAggregationBucket[]>;
}
