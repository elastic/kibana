/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, getOr } from 'lodash/fp';

import type { IEsSearchResponse } from '@kbn/data-plugin/common';
import {
  HostsOverviewStrategyResponse,
  HostsQueries,
  HostOverviewRequestOptions,
  OverviewHostHit,
} from '../../../../../../common/search_strategy/security_solution/hosts';
import { inspectStringifyObject } from '../../../../../utils/build_query';
import { SecuritySolutionFactory } from '../../types';
import { buildOverviewHostQuery } from './query.overview_host.dsl';

export const hostOverview: SecuritySolutionFactory<HostsQueries.overview> = {
  buildDsl: (options: HostOverviewRequestOptions) => buildOverviewHostQuery(options),
  parse: async (
    options: HostOverviewRequestOptions,
    response: IEsSearchResponse<OverviewHostHit>
  ): Promise<HostsOverviewStrategyResponse> => {
    // @ts-expect-error specify aggregations type explicitly
    const aggregations: OverviewHostHit = get('aggregations', response.rawResponse) || {};
    const inspect = {
      dsl: [inspectStringifyObject(buildOverviewHostQuery(options))],
    };

    return {
      ...response,
      inspect,
      overviewHost: {
        auditbeatAuditd: getOr(null, 'auditd_count.doc_count', aggregations),
        auditbeatFIM: getOr(null, 'fim_count.doc_count', aggregations),
        auditbeatLogin: getOr(null, 'system_module.login_count.doc_count', aggregations),
        auditbeatPackage: getOr(null, 'system_module.package_count.doc_count', aggregations),
        auditbeatProcess: getOr(null, 'system_module.process_count.doc_count', aggregations),
        auditbeatUser: getOr(null, 'system_module.user_count.doc_count', aggregations),
        endgameDns: getOr(null, 'endgame_module.dns_event_count.doc_count', aggregations),
        endgameFile: getOr(null, 'endgame_module.file_event_count.doc_count', aggregations),
        endgameImageLoad: getOr(
          null,
          'endgame_module.image_load_event_count.doc_count',
          aggregations
        ),
        endgameNetwork: getOr(null, 'endgame_module.network_event_count.doc_count', aggregations),
        endgameProcess: getOr(null, 'endgame_module.process_event_count.doc_count', aggregations),
        endgameRegistry: getOr(null, 'endgame_module.registry_event.doc_count', aggregations),
        endgameSecurity: getOr(null, 'endgame_module.security_event_count.doc_count', aggregations),
        filebeatSystemModule: getOr(null, 'system_module.filebeat_count.doc_count', aggregations),
        winlogbeatSecurity: getOr(
          null,
          'winlog_module.security_event_count.doc_count',
          aggregations
        ),
        winlogbeatMWSysmonOperational: getOr(
          null,
          'winlog_module.mwsysmon_operational_event_count.doc_count',
          aggregations
        ),
      },
    };
  },
};
