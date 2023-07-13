/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { DEFAULT_RISK_SCORE_PAGE_SIZE, RISK_SCORE_PREVIEW_URL } from '../../../../common/constants';
import { riskScorePreviewRequestSchema } from '../../../../common/risk_engine/risk_score_preview/request_schema';
import type { SecuritySolutionPluginRouter } from '../../../types';
import { buildRouteValidation } from '../../../utils/build_validation/route_validation';
import { riskScoreService } from '../risk_score_service';
import { getRiskInputsIndex } from '../helpers';
import { DATAVIEW_NOT_FOUND } from './translations';

export const riskScorePreviewRoute = (router: SecuritySolutionPluginRouter, logger: Logger) => {
  router.post(
    {
      path: RISK_SCORE_PREVIEW_URL,
      validate: { body: buildRouteValidation(riskScorePreviewRequestSchema) },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      const esClient = (await context.core).elasticsearch.client.asCurrentUser;
      const soClient = (await context.core).savedObjects.client;
      const siemClient = (await context.securitySolution).getAppClient();
      const riskScore = riskScoreService({
        esClient,
        logger,
      });

      const {
        after_keys: userAfterKeys,
        data_view_id: dataViewId,
        debug,
        page_size: userPageSize,
        identifier_type: identifierType,
        filter,
        range: userRange,
        weights,
      } = request.body;

      try {
        let index: string;
        if (dataViewId) {
          const dataViewIndex = await getRiskInputsIndex({
            dataViewId,
            logger,
            soClient,
          });

          if (!dataViewIndex) {
            return siemResponse.error({
              statusCode: 404,
              body: DATAVIEW_NOT_FOUND(dataViewId),
            });
          }
          index = dataViewIndex;
        }
        index ??= siemClient.getAlertsIndex();

        const afterKeys = userAfterKeys ?? {};
        const range = userRange ?? { start: 'now-15d', end: 'now' };
        const pageSize = userPageSize ?? DEFAULT_RISK_SCORE_PAGE_SIZE;

        const result = await riskScore.getScores({
          afterKeys,
          debug,
          pageSize,
          identifierType,
          index,
          filter,
          range,
          weights,
        });

        return response.ok({ body: result });
      } catch (e) {
        const error = transformError(e);

        return siemResponse.error({
          statusCode: error.statusCode,
          body: { message: error.message, full_error: JSON.stringify(e) },
        });
      }
    }
  );
};
