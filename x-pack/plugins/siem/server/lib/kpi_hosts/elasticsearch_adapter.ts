/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';

import { KpiHostsData } from '../../graphql/types';
import { FrameworkAdapter, FrameworkRequest, RequestBasicOptions } from '../framework';
import { TermAggregation } from '../types';

import { buildAuthQuery } from './query_authentication.dsl';
import { buildGeneralQuery } from './query_general.dsl';
import { KpiHostsAdapter, KpiHostsESMSearchBody, KpiHostsHit } from './types';

export class ElasticsearchKpiHostsAdapter implements KpiHostsAdapter {
  constructor(private readonly framework: FrameworkAdapter) {}

  public async getKpiHosts(
    request: FrameworkRequest,
    options: RequestBasicOptions
  ): Promise<KpiHostsData> {
    const generalQuery: KpiHostsESMSearchBody[] = buildGeneralQuery(options);
    const authQuery: KpiHostsESMSearchBody[] = buildAuthQuery(options);
    const response = await this.framework.callWithRequest<KpiHostsHit, TermAggregation>(
      request,
      'msearch',
      {
        body: [...generalQuery, ...authQuery],
      }
    );

    return {
      hosts: getOr(null, 'responses.0.aggregations.hosts.value', response),
      agents: getOr(null, 'responses.0.aggregations.agents.value', response),
      authentication: {
        success: getOr(null, 'responses.1.aggregations.authentication_success.doc_count', response),
        failure: getOr(null, 'responses.1.aggregations.authentication_failure.doc_count', response),
      },
      uniqueSourceIps: getOr(null, 'responses.0.aggregations.unique_source_ips.value', response),
      uniqueDestinationIps: getOr(
        null,
        'responses.0.aggregations.unique_destination_ips.value',
        response
      ),
    };
  }
}
