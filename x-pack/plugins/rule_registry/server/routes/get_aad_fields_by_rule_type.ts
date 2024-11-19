/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import * as t from 'io-ts';

import { RacRequestHandlerContext } from '../types';
import { BASE_RAC_ALERTS_API_PATH } from '../../common/constants';
import { buildRouteValidation } from './utils/route_validation';

export const getAADFieldsByRuleType = (router: IRouter<RacRequestHandlerContext>) => {
  router.get(
    {
      path: `${BASE_RAC_ALERTS_API_PATH}/aad_fields`,
      validate: {
        query: buildRouteValidation(
          t.exact(
            t.type({
              ruleTypeId: t.string,
            })
          )
        ),
      },
      options: {
        access: 'internal',
        tags: ['access:rac'],
      },
    },
    async (context, request, response) => {
      try {
        const racContext = await context.rac;
        const alertsClient = await racContext.getAlertsClient();
        const { ruleTypeId } = request.query;

        const aadFields = await alertsClient.getAADFields({ ruleTypeId });

        return response.ok({
          body: aadFields,
        });
      } catch (error) {
        const formatedError = transformError(error);
        const contentType = {
          'content-type': 'application/json',
        };
        const defaultedHeaders = {
          ...contentType,
        };

        return response.customError({
          headers: defaultedHeaders,
          statusCode: formatedError.statusCode,
          body: {
            message: formatedError.message,
            attributes: {
              success: false,
            },
          },
        });
      }
    }
  );
};
