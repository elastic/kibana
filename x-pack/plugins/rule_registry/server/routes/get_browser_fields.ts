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

export const getBrowserFields = (router: IRouter<RacRequestHandlerContext>) => {
  router.get(
    {
      path: `${BASE_RAC_ALERTS_API_PATH}/browser_fields`,
      validate: {
        query: buildRouteValidation(
          t.partial({
            // @deprecated use rule_type_ids
            featureIds: t.union([t.string, t.array(t.string)]),
            rule_type_ids: t.union([t.string, t.array(t.string)]),
          })
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
        const { featureIds, rule_type_ids: ruleTypeIds } = request.query;

        if (featureIds && ruleTypeIds) {
          throw new Error(
            `The browser_fields API is unable to accommodate requests containing feature IDs and rule type IDs.`
          );
        }
        let fields = {};
        if (featureIds) {
          const onlyO11yFeatureIds = (Array.isArray(featureIds) ? featureIds : [featureIds]).filter(
            (fId) => fId !== 'siem'
          );
          const o11yIndices =
            (onlyO11yFeatureIds
              ? await alertsClient.getAuthorizedAlertsIndicesByFeatureIds(onlyO11yFeatureIds)
              : []) ?? [];

          fields = await alertsClient.getBrowserFields({
            indices: o11yIndices,
            metaFields: ['_id', '_index'],
            allowNoIndex: true,
            featureIds: onlyO11yFeatureIds,
          });
        } else if (ruleTypeIds) {
          const ruleTypeIdsArray = Array.isArray(ruleTypeIds) ? ruleTypeIds : [ruleTypeIds];
          const alertIndices =
            (await alertsClient.getAuthorizedAlertsIndicesByRuleTypeIds(ruleTypeIdsArray)) ?? [];
          fields = await alertsClient.getBrowserFields({
            indices: alertIndices,
            metaFields: ['_id', '_index'],
            allowNoIndex: true,
            ruleTypeIds: ruleTypeIdsArray,
          });
        }

        return response.ok({
          body: fields,
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
