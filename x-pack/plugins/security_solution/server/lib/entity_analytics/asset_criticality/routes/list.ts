/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import {
  ASSET_CRITICALITY_PUBLIC_LIST_URL,
  APP_ID,
  API_VERSIONS,
} from '../../../../../common/constants';
import { checkAndInitAssetCriticalityResources } from '../check_and_init_asset_criticality_resources';
import type { FindAssetCriticalityRecordsResponse } from '../../../../../common/api/entity_analytics/asset_criticality';
import { FindAssetCriticalityRecordsRequestQuery } from '../../../../../common/api/entity_analytics/asset_criticality';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { AssetCriticalityAuditActions } from '../audit';
import { AUDIT_CATEGORY, AUDIT_OUTCOME, AUDIT_TYPE } from '../../audit';

export const assetCriticalityPublicListRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger
) => {
  router.versioned
    .get({
      access: 'public',
      path: ASSET_CRITICALITY_PUBLIC_LIST_URL,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            query: buildRouteValidationWithZod(FindAssetCriticalityRecordsRequestQuery),
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<FindAssetCriticalityRecordsResponse>> => {
        const siemResponse = buildSiemResponse(response);
        try {
          await checkAndInitAssetCriticalityResources(context, logger);
          const securitySolution = await context.securitySolution;
          const assetCriticalityClient = securitySolution.getAssetCriticalityDataClient();

          const {
            page = 1,
            per_page: perPage = 10,
            sort_field: sortField,
            sort_direction: sortDirection = 'asc',
            kuery,
          } = request.query;

          const from = (page - 1) * perPage;
          const sort = sortField ? [{ [sortField]: sortDirection }] : undefined;

          const searchRes = await assetCriticalityClient.searchByKuery({
            kuery,
            from,
            size: perPage,
            sort,
          });

          const { records, total } = assetCriticalityClient.formatSearchResponse(searchRes);

          securitySolution.getAuditLogger()?.log({
            message: 'User searched criticality levels',
            event: {
              action: AssetCriticalityAuditActions.ASSET_CRITICALITY_SEARCH,
              category: AUDIT_CATEGORY.DATABASE,
              type: AUDIT_TYPE.ACCESS,
              outcome: AUDIT_OUTCOME.SUCCESS,
            },
          });

          const body = {
            records,
            total,
            page,
            per_page: perPage,
          };

          return response.ok({ body });
        } catch (e) {
          const error = transformError(e);

          return siemResponse.error({
            statusCode: error.statusCode,
            body: { message: error.message, full_error: JSON.stringify(e) },
            bypassErrorFormat: true,
          });
        }
      }
    );
};
