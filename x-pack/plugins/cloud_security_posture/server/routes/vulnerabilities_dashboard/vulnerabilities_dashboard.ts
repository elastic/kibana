/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { CnvmDashboardData } from '../../../common/types';
import { VULNERABILITIES_STATS_ROUTE_PATH } from '../../../common/constants';
import { CspRouter } from '../../types';
import { getVulnerabilitiesStatistics } from './get_vulnerabilities_statistics';

export interface KeyDocCount<TKey = string> {
  key: TKey;
  doc_count: number;
}

export const defineGetVulnerabilitiesDashboardRoute = (router: CspRouter): void =>
  router.get(
    {
      path: VULNERABILITIES_STATS_ROUTE_PATH,
      validate: false,
      options: {
        tags: ['access:cloud-security-posture-read'],
      },
    },
    async (context, request, response) => {
      const cspContext = await context.csp;

      try {
        const esClient = cspContext.esClient.asCurrentUser;

        const query: QueryDslQueryContainer = {
          bool: {
            filter: [
              { exists: { field: 'vulnerability.score.base' } },
              { exists: { field: 'vulnerability.score.version' } },
              { exists: { field: 'vulnerability.severity' } },
              { exists: { field: 'resource.name' } },
              { match_phrase: { 'vulnerability.enumeration': 'CVE' } },
            ],
            must_not: [{ match_phrase: { 'vulnerability.severity': 'UNKNOWN' } }],
          },
        };

        const [cnvmStatistics] = await Promise.all([getVulnerabilitiesStatistics(esClient, query)]);

        const body: CnvmDashboardData = {
          cnvmStatistics,
        };

        return response.ok({
          body,
        });
      } catch (err) {
        const error = transformError(err);
        cspContext.logger.error(`Error while fetching Vulnerabilities stats: ${err}`);

        return response.customError({
          body: { message: error.message },
          statusCode: error.statusCode,
        });
      }
    }
  );
