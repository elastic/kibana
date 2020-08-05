/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';

import { OverviewHostData, OverviewNetworkData } from '../../graphql/types';
import { inspectStringifyObject } from '../../utils/build_query';
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
    const dsl = buildOverviewNetworkQuery(options);
    const response = await this.framework.callWithRequest<OverviewNetworkHit, TermAggregation>(
      request,
      'search',
      dsl
    );
    const inspect = {
      dsl: [inspectStringifyObject(dsl)],
      response: [inspectStringifyObject(response)],
    };

    return {
      inspect,
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
    const dsl = buildOverviewHostQuery(options);
    const response = await this.framework.callWithRequest<OverviewHostHit, TermAggregation>(
      request,
      'search',
      dsl
    );
    const inspect = {
      dsl: [inspectStringifyObject(dsl)],
      response: [inspectStringifyObject(response)],
    };

    return {
      inspect,
      auditbeatAuditd: getOr(null, 'aggregations.auditd_count.doc_count', response),
      auditbeatFIM: getOr(null, 'aggregations.fim_count.doc_count', response),
      auditbeatLogin: getOr(null, 'aggregations.system_module.login_count.doc_count', response),
      auditbeatPackage: getOr(null, 'aggregations.system_module.package_count.doc_count', response),
      auditbeatProcess: getOr(null, 'aggregations.system_module.process_count.doc_count', response),
      auditbeatUser: getOr(null, 'aggregations.system_module.user_count.doc_count', response),
      endgameDns: getOr(null, 'aggregations.endgame_module.dns_event_count.doc_count', response),
      endgameFile: getOr(null, 'aggregations.endgame_module.file_event_count.doc_count', response),
      endgameImageLoad: getOr(
        null,
        'aggregations.endgame_module.image_load_event_count.doc_count',
        response
      ),
      endgameNetwork: getOr(
        null,
        'aggregations.endgame_module.network_event_count.doc_count',
        response
      ),
      endgameProcess: getOr(
        null,
        'aggregations.endgame_module.process_event_count.doc_count',
        response
      ),
      endgameRegistry: getOr(
        null,
        'aggregations.endgame_module.registry_event.doc_count',
        response
      ),
      endgameSecurity: getOr(
        null,
        'aggregations.endgame_module.security_event_count.doc_count',
        response
      ),
      filebeatSystemModule: getOr(
        null,
        'aggregations.system_module.filebeat_count.doc_count',
        response
      ),
      winlogbeatSecurity: getOr(
        null,
        'aggregations.winlog_module.security_event_count.doc_count',
        response
      ),
      winlogbeatMWSysmonOperational: getOr(
        null,
        'aggregations.winlog_module.mwsysmon_operational_event_count.doc_count',
        response
      ),
    };
  }
}
