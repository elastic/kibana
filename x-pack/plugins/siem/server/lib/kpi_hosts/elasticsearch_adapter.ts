/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';

import { KpiHostsData } from '../../graphql/types';
// tslint:disable-next-line: prettier
import { FrameworkAdapter, FrameworkRequest, RequestBasicOptions } from '../framework';
import { TermAggregation } from '../types';

import { buildAuthQuery } from './query_authentication.dsl';
import { buildEventQuery } from './query_event.dsl';
import { buildGeneralQuery } from './query_general.dsl';
import { buildProcessQuery } from './query_process_count.dsl';
import { KpiHostsAdapter, KpiHostsESMSearchBody, KpiHostsHit } from './types';

export class ElasticsearchKpiHostsAdapter implements KpiHostsAdapter {
  constructor(private readonly framework: FrameworkAdapter) {}

  public async getKpiHosts(
    request: FrameworkRequest,
    options: RequestBasicOptions
  ): Promise<KpiHostsData> {
    const generalQuery: KpiHostsESMSearchBody[] = buildGeneralQuery(options);
    const processQuery: KpiHostsESMSearchBody[] = buildProcessQuery(options);
    const authQuery: KpiHostsESMSearchBody[] = buildAuthQuery(options);
    const auditbeatFIMQuery: KpiHostsESMSearchBody[] = buildEventQuery(
      { agentType: 'auditbeat', eventModule: 'file_integrity' },
      options
    );
    const auditbeatAuditdQuery: KpiHostsESMSearchBody[] = buildEventQuery(
      { agentType: 'auditbeat', eventModule: 'auditd' },
      options
    );

    const winlogbeatQuery: KpiHostsESMSearchBody[] = buildEventQuery(
      { agentType: 'winlogbeat' },
      options
    );

    const filebeatQuery: KpiHostsESMSearchBody[] = buildEventQuery(
      { agentType: 'filebeat' },
      options
    );
    const response = await this.framework.callWithRequest<KpiHostsHit, TermAggregation>(
      request,
      'msearch',
      {
        body: [
          ...generalQuery,
          ...processQuery,
          ...authQuery,
          ...auditbeatFIMQuery,
          ...auditbeatAuditdQuery,
          ...winlogbeatQuery,
          ...filebeatQuery,
        ],
      }
    );
    return {
      hosts: getOr(null, 'responses.0.aggregations.host.value', response),
      installedPackages: getOr(null, 'responses.0.aggregations.installedPackages.value', response),
      processCount: getOr(null, 'responses.1.hits.total.value', response),
      authenticationSuccess: getOr(
        null,
        'responses.2.aggregations.authentication_success.doc_count',
        response
      ),
      authenticationFailure: getOr(
        null,
        'responses.2.aggregations.authentication_failure.doc_count',
        response
      ),
      fimEvents: getOr(null, 'responses.3.hits.total.value', response),
      auditdEvents: getOr(null, 'responses.4.hits.total.value', response),
      winlogbeatEvents: getOr(null, 'responses.5.hits.total.value', response),
      filebeatEvents: getOr(null, 'responses.6.hits.total.value', response),
      sockets: getOr(null, 'responses.0.aggregations.sockets.value', response),
      uniqueSourceIps: getOr(null, 'responses.0.aggregations.unique_source_ips.value', response),
      uniqueDestinationIps: getOr(
        null,
        'responses.0.aggregations.unique_destination_ips.value',
        response
      ),
    };
  }
}
