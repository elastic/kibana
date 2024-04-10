/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import * as t from 'io-ts';
import { transformError } from '@kbn/securitysolution-es-utils';
import { validFeatureIds } from '@kbn/rule-data-utils';
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
              // @deprecated use ruletypes
              features: t.string,
              ruletypes: t.string,
            })
          )
        ),
      },
      options: {
        tags: ['access:rac'],
      },
    },
    async (context, request, response) => {
      try {
        const racContext = await context.rac;
        const alertsClient = await racContext.getAlertsClient();
        const { features, ruletypes } = request.query;

        if (features && ruletypes) {
          throw new Error(
            `The find index API is unable to accommodate requests containing feature IDs and rule type IDs.`
          );
        }

        const indexName = features
          ? await alertsClient.getAuthorizedAlertsIndicesByFeatureIds(
              features?.split(',') ?? validFeatureIds
            )
          : ruletypes
          ? await alertsClient.getAuthorizedAlertsIndicesByRuleTypeIds(ruletypes?.split(',') ?? [])
          : null;

        if (indexName == null) {
          return response.notFound({
            body: {
              message: `alert index was not found with features being ${features} or rule types being ${ruletypes}`,
            },
          });
        }
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
