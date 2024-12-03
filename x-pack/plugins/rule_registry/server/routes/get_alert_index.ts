/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import * as t from 'io-ts';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidation } from './utils/route_validation';

import { RacRequestHandlerContext } from '../types';
import { BASE_RAC_ALERTS_API_PATH } from '../../common/constants';

export const getAlertsIndexRoute = (router: IRouter<RacRequestHandlerContext>) => {
  router.get(
    {
      path: `${BASE_RAC_ALERTS_API_PATH}/index`,
      validate: {
        query: buildRouteValidation(
          t.exact(
            t.partial({
              ruleTypeIds: t.union([t.string, t.array(t.string)]),
            })
          )
        ),
      },
      security: {
        authz: {
          requiredPrivileges: ['rac'],
        },
      },
      options: {
        access: 'internal',
      },
    },
    async (context, request, response) => {
      try {
        const racContext = await context.rac;
        const alertsClient = await racContext.getAlertsClient();
        const { ruleTypeIds } = request.query;

        const ruleTypeIdsAsArray =
          ruleTypeIds != null
            ? Array.isArray(ruleTypeIds)
              ? ruleTypeIds
              : [ruleTypeIds]
            : ruleTypeIds;

        const indexName = await alertsClient.getAuthorizedAlertsIndices(ruleTypeIdsAsArray);

        return response.ok({
          body: { index_name: indexName },
        });
      } catch (exc) {
        const err = transformError(exc);
        const contentType = {
          'content-type': 'application/json',
        };
        const defaultedHeaders = {
          ...contentType,
        };

        return response.customError({
          headers: defaultedHeaders,
          statusCode: err.statusCode,
          body: {
            message: err.message,
            attributes: {
              success: false,
            },
          },
        });
      }
    }
  );
};
