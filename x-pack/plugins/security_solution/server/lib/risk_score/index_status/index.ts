/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';

import { APP_ID, RISK_SCORE_INDEX_STATUS_API_URL } from '../../../../common/constants';
import type { SecuritySolutionPluginRouter } from '../../../types';
import { buildRouteValidation } from '../../../utils/build_validation/route_validation';
import { buildSiemResponse } from '../../detection_engine/routes/utils';
import { indexStatusRequestQuery } from '../../../../common/api/entity_analytics/risk_score';

export const getRiskScoreIndexStatusRoute = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .get({
      access: 'internal',
      path: RISK_SCORE_INDEX_STATUS_API_URL,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
        },
      },
    })
    .addVersion(
      {
        validate: {
          request: {
            query: buildRouteValidation(indexStatusRequestQuery),
          },
        },
        version: '1',
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        const coreContext = await context.core;
        const { indexName, entity } = request.query;
        try {
          const newFieldName = `${entity}.risk.calculated_level`;
          const res = await coreContext.elasticsearch.client.asCurrentUser.fieldCaps({
            index: indexName,
            fields: newFieldName,
            ignore_unavailable: true,
            allow_no_indices: false,
          });
          const isDeprecated = !Object.keys(res.fields).includes(newFieldName);

          return response.ok({
            body: { isDeprecated, isEnabled: true },
          });
        } catch (err) {
          const error = transformError(err);
          if (error.statusCode === 404) {
            // index does not exist, therefore cannot be deprecated
            return response.ok({
              body: { isDeprecated: false, isEnabled: false },
            });
          }
          return siemResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
