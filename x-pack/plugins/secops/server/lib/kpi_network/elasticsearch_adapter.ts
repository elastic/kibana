/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import { KpiNetworkData } from '../../graphql/types';
import { FrameworkAdapter, FrameworkRequest, RequestBasicOptions } from '../framework';
import { TermAggregation } from '../types';
import { buildQuery } from './query.dsl';
import { KpiNetworkAdapter, KpiNetworkHit } from './types';

export class ElasticsearchKpiNetworkAdapter implements KpiNetworkAdapter {
  constructor(private readonly framework: FrameworkAdapter) {}

  public async getKpiNetwork(
    request: FrameworkRequest,
    options: RequestBasicOptions
  ): Promise<KpiNetworkData> {
    const response = await this.framework.callWithRequest<KpiNetworkHit, TermAggregation>(
      request,
      'search',
      buildQuery(options)
    );

    return {
      networkEvents: getOr(null, 'hits.total.value', response),
      uniqueFlowId: getOr(null, 'aggregations.unique_flow_id.value', response),
      activeAgents: getOr(null, 'aggregations.active_agents.value', response),
    };
  }
}
