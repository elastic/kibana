/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { getVulnerabilitiesTrends } from './get_vulnerabilities_trend';
import type { CnvmDashboardData } from '../../../common/types';
import { VULNERABILITIES_DASHBOARD_ROUTE_PATH } from '../../../common/constants';
import { getSafeVulnerabilitiesQueryFilter } from '../../../common/utils/get_safe_vulnerabilities_query_filter';
import { CspRouter } from '../../types';
import { getVulnerabilitiesStatistics } from './get_vulnerabilities_statistics';
import { getTopVulnerableResources } from './get_top_vulnerable_resources';
import { getTopPatchableVulnerabilities } from './get_top_patchable_vulnerabilities';
import { getTopVulnerabilities } from './get_top_vulnerabilities';

export interface KeyDocCount<TKey = string> {
  key: TKey;
  doc_count: number;
}

export const defineGetVulnerabilitiesDashboardRoute = (router: CspRouter): void =>
  router.get(
    {
      path: VULNERABILITIES_DASHBOARD_ROUTE_PATH,
      validate: false,
      options: {
        tags: ['access:cloud-security-posture-read'],
      },
    },
    async (context, request, response) => {
      const cspContext = await context.csp;

      try {
        const esClient = cspContext.esClient.asCurrentUser;

        const query = getSafeVulnerabilitiesQueryFilter();

        const [
          cnvmStatistics,
          vulnTrends,
          topVulnerableResources,
          topPatchableVulnerabilities,
          topVulnerabilities,
        ] = await Promise.all([
          getVulnerabilitiesStatistics(esClient, query),
          getVulnerabilitiesTrends(esClient),
          getTopVulnerableResources(esClient, query),
          getTopPatchableVulnerabilities(esClient, query),
          getTopVulnerabilities(esClient, query),
        ]);

        const body: CnvmDashboardData = {
          cnvmStatistics,
          vulnTrends,
          topVulnerableResources,
          topPatchableVulnerabilities,
          topVulnerabilities,
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
