/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { IRouter } from '@kbn/core/server';
import * as t from 'io-ts';
import { transformError } from '@kbn/securitysolution-es-utils';
import moment from 'moment';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { RacRequestHandlerContext } from '../types';
import { BASE_RAC_ALERTS_API_PATH } from '../../common/constants';
import { buildRouteValidation } from './utils/route_validation';

export const getAlertSummaryRoute = (router: IRouter<RacRequestHandlerContext>) => {
  router.post(
    {
      path: `${BASE_RAC_ALERTS_API_PATH}/_alert_summary`,
      validate: {
        body: buildRouteValidation(
          t.intersection([
            t.exact(
              t.type({
                gte: t.string,
                lte: t.string,
              })
            ),
            t.exact(
              t.partial({
                // @deprecated use rule_type_ids
                featureIds: t.array(t.string),
                rule_type_ids: t.array(t.string),
                fixed_interval: t.string,
                filter: t.array(t.object),
              })
            ),
          ])
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
        const {
          gte,
          lte,
          featureIds,
          filter,
          fixed_interval: fixedInterval,
          rule_type_ids: ruleTypeIds,
        } = request.body;
        if (
          !(
            moment(gte, 'YYYY-MM-DDTHH:mm:ss.SSSZ', true).isValid() &&
            moment(lte, 'YYYY-MM-DDTHH:mm:ss.SSSZ', true).isValid()
          )
        ) {
          throw Boom.badRequest('gte and/or lte are not following the UTC format');
        }

        if (fixedInterval && fixedInterval?.match(/^\d{1,6}['s','m','h','d']$/) == null) {
          throw Boom.badRequest(
            `fixed_interval (value: ${fixedInterval}) is not following the expected format 1s, 1m, 1h, 1d with at most 6 digits`
          );
        }

        if (featureIds && ruleTypeIds) {
          throw new Error(
            `The alert summary API is unable to accommodate requests containing feature IDs and rule type IDs.`
          );
        }

        const alertSummaryParams = {
          gte,
          lte,
          filter: filter as estypes.QueryDslQueryContainer[],
          fixedInterval,
        };
        const aggs = featureIds
          ? await alertsClient.getAlertSummary({ ...alertSummaryParams, featureIds })
          : ruleTypeIds
          ? await alertsClient.getAlertSummary({ ...alertSummaryParams, ruleTypeIds })
          : {};

        return response.ok({
          body: aggs,
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
