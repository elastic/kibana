/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import * as t from 'io-ts';
import { transformError } from '@kbn/securitysolution-es-utils';
// import { validFeatureIds } from '@kbn/rule-data-utils';
import { IndexPatternsFetcher } from '@kbn/data-plugin/server';
import { schema } from '@kbn/config-schema';
import { buildRouteValidation } from './utils/route_validation';

import { RacRequestHandlerContext } from '../types';
// import { BASE_RAC_ALERTS_API_PATH } from '../../common/constants';

export const getAlertFieldByFeatureId = (router: IRouter<RacRequestHandlerContext>) => {
  router.get(
    {
      path: `/internal/tbd`,
      validate: {
        query: schema.object({
          featureId: schema.string(),
        }),
      },
      options: {
        /**
         * Additional metadata tag strings to attach to the route.
         */
        // tags?: readonly string[];
        tags: ['access:rac'], // what is rac?, are all possible options listed somewhere?
      },
    },
    async (context, request, response) => {
      try {
        const racContext = await context.rac;

        console.log(JSON.stringify(racContext));
        // const indexPatternsFetcherAsInternalUser = new IndexPatternsFetcher(
        //   esClient.asInternalUser
        // );
        return response.ok({
          body: { featureId: request.query.featureId, context: JSON.stringify(context) },
        });
      } catch (exc) {
        const err = transformError(exc);
        return response.customError({
          headers: {
            'content-type': 'application/json',
          },
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
