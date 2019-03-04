/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr, isNil } from 'lodash/fp';

import { KpiNetworkData } from '../../graphql/types';
import {
  DatabaseMultiResponse,
  FrameworkAdapter,
  FrameworkRequest,
  RequestBasicOptions,
} from '../framework';
import { TermAggregation } from '../types';

import { buildGeneralQuery } from './query_general.dsl';
import { buildUniquePrvateIpQuery } from './query_unique_private_ips.dsl';
import { KpiNetworkAdapter, KpiNetworkESMSearchBody, KpiNetworkHit } from './types';

export class ElasticsearchKpiNetworkAdapter implements KpiNetworkAdapter {
  constructor(private readonly framework: FrameworkAdapter) {}

  public async getKpiNetwork(
    request: FrameworkRequest,
    options: RequestBasicOptions
  ): Promise<KpiNetworkData> {
    const generalQuery: KpiNetworkESMSearchBody[] = buildGeneralQuery(options);
    const uniqueSourcePrivateIpsQuery: KpiNetworkESMSearchBody[] = buildUniquePrvateIpQuery(
      'source',
      options
    );
    const uniqueDestinationPrivateIpsQuery: KpiNetworkESMSearchBody[] = buildUniquePrvateIpQuery(
      'destination',
      options
    );
    const response = await this.framework.callWithRequest<KpiNetworkHit, TermAggregation>(
      request,
      'msearch',
      {
        body: [
          ...generalQuery,
          ...uniqueSourcePrivateIpsQuery,
          ...uniqueDestinationPrivateIpsQuery,
        ],
      }
    );

    return {
      networkEvents: getOr(null, 'responses.0.hits.total.value', response),
      uniqueFlowId: getOr(null, 'responses.0.aggregations.unique_flow_id.value', response),
      activeAgents: getOr(null, 'responses.0.aggregations.active_agents.value', response),
      uniquePrivateIps: this.combineUniquePrivateIp(response),
    };
  }

  private combineUniquePrivateIp(
    response: DatabaseMultiResponse<KpiNetworkHit, TermAggregation>
  ): number | null {
    const uniqueSourcePrivateIp = getOr(
      null,
      'responses.1.aggregations.unique_private_ips.value',
      response
    );
    const uniqueDestinationPrivateIp = getOr(
      null,
      'responses.2.aggregations.unique_private_ips.value',
      response
    );
    if (!isNil(uniqueSourcePrivateIp) && !isNil(uniqueDestinationPrivateIp)) {
      return uniqueSourcePrivateIp + uniqueDestinationPrivateIp;
    } else if (isNil(uniqueSourcePrivateIp) && !isNil(uniqueDestinationPrivateIp)) {
      return uniqueDestinationPrivateIp;
    } else if (!isNil(uniqueSourcePrivateIp) && isNil(uniqueDestinationPrivateIp)) {
      return uniqueSourcePrivateIp;
    }
    return null;
  }
}
