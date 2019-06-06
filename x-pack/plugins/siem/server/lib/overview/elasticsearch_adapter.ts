/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';

import { OverviewHostData, OverviewNetworkData } from '../../graphql/types';
import { FrameworkAdapter, FrameworkRequest, RequestBasicOptions } from '../framework';
import { TermAggregation } from '../types';

import { buildOverviewHostQuery, buildOverviewNetworkQuery } from './query.dsl';
import { OverviewAdapter, OverviewHostHit, OverviewNetworkHit } from './types';

export class ElasticsearchOverviewAdapter implements OverviewAdapter {
  constructor(private readonly framework: FrameworkAdapter) {}

  public async getOverviewNetwork(
    request: FrameworkRequest,
    options: RequestBasicOptions
  ): Promise<OverviewNetworkData> {
    const response = await this.framework.callWithRequest<OverviewNetworkHit, TermAggregation>(
      request,
      'search',
      buildOverviewNetworkQuery(options)
    );

    return {
      auditbeatSocket: getOr(null, 'aggregations.unique_socket_count.doc_count', response),
      filebeatCisco: getOr(
        null,
        'aggregations.unique_filebeat_count.unique_cisco_count.doc_count',
        response
      ),
      filebeatNetflow: getOr(
        null,
        'aggregations.unique_filebeat_count.unique_netflow_count.doc_count',
        response
      ),
      filebeatPanw: getOr(
        null,
        'aggregations.unique_filebeat_count.unique_panw_count.doc_count',
        response
      ),
      filebeatSuricata: getOr(null, 'aggregations.unique_suricata_count.doc_count', response),
      filebeatZeek: getOr(null, 'aggregations.unique_zeek_count.doc_count', response),
      packetbeatDNS: getOr(null, 'aggregations.unique_dns_count.doc_count', response),
      packetbeatFlow: getOr(null, 'aggregations.unique_flow_count.doc_count', response),
      packetbeatTLS: getOr(
        null,
        'aggregations.unique_packetbeat_count.unique_tls_count.doc_count',
        response
      ),
    };
  }

  public async getOverviewHost(
    request: FrameworkRequest,
    options: RequestBasicOptions
  ): Promise<OverviewHostData> {
    const response = await this.framework.callWithRequest<OverviewHostHit, TermAggregation>(
      request,
      'search',
      buildOverviewHostQuery(options)
    );

    return {
      auditbeatAuditd: getOr(null, 'aggregations.auditd_count.doc_count', response),
      auditbeatFIM: getOr(null, 'aggregations.fim_count.doc_count', response),
      auditbeatLogin: getOr(null, 'aggregations.system_module.login_count.doc_count', response),
      auditbeatPackage: getOr(null, 'aggregations.system_module.package_count.doc_count', response),
      auditbeatProcess: getOr(null, 'aggregations.system_module.process_count.doc_count', response),
      auditbeatUser: getOr(null, 'aggregations.system_module.user_count.doc_count', response),
      filebeatSystemModule: getOr(
        null,
        'aggregations.system_module.filebeat_count.doc_count',
        response
      ),
      winlogbeat: getOr(null, 'aggregations.winlog_count.doc_count', response),
    };
  }
}
