/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NetworkTopNFlowData, NetworkTopNFlowType } from '../../graphql/types';
import { FrameworkRequest, RequestOptions } from '../framework';
export * from './elasticsearch_adapter';
import { NetworkTopNFlowAdapter } from './types';

export interface NetworkTopNFlowRequestOptions extends RequestOptions {
  networkTopNFlowType: NetworkTopNFlowType;
}

export class NetworkTopNFlow {
  constructor(private readonly adapter: NetworkTopNFlowAdapter) {}

  public async getNetworkTopNFlow(
    req: FrameworkRequest,
    options: NetworkTopNFlowRequestOptions
  ): Promise<NetworkTopNFlowData> {
    return await this.adapter.getNetworkTopNFlow(req, options);
  }
}
