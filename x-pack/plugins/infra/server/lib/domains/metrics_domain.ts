/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest, RequestHandlerContext } from 'src/core/server';
import { InfraMetricsAdapter, InfraMetricsRequestOptions } from '../adapters/metrics/adapter_types';
import { NodeDetailsMetricData } from '../../../common/http_api/node_details_api';

export class InfraMetricsDomain {
  private adapter: InfraMetricsAdapter;

  constructor(adapter: InfraMetricsAdapter) {
    this.adapter = adapter;
  }

  public async getMetrics(
    requestContext: RequestHandlerContext,
    options: InfraMetricsRequestOptions,
    rawRequest: KibanaRequest
  ): Promise<NodeDetailsMetricData[]> {
    return await this.adapter.getMetrics(requestContext, options, rawRequest);
  }
}
