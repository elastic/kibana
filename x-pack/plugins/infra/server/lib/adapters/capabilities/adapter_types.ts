/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraSourceConfiguration } from '../../sources';
import { InfraCapabilityAggregationBucket, InfraFrameworkRequest } from '../framework';

export interface InfraCapabilitiesAdapter {
  getMetricCapabilities(
    req: InfraFrameworkRequest,
    sourceConfiguration: InfraSourceConfiguration,
    nodeName: string,
    nodeType: string
  ): Promise<InfraCapabilityAggregationBucket[]>;
  getLogCapabilities(
    req: InfraFrameworkRequest,
    sourceConfiguration: InfraSourceConfiguration,
    nodeName: string,
    nodeType: string
  ): Promise<InfraCapabilityAggregationBucket[]>;
}
