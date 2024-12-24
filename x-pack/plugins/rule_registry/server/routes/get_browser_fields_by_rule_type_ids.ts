/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import * as t from 'io-ts';

import { isSiemRuleType } from '@kbn/rule-data-utils';
import { RacRequestHandlerContext } from '../types';
import { BASE_RAC_ALERTS_API_PATH } from '../../common/constants';
import { buildRouteValidation } from './utils/route_validation';

export const getBrowserFieldsByFeatureId = (router: IRouter<RacRequestHandlerContext>) => {
  router.get(
    {
      path: `${BASE_RAC_ALERTS_API_PATH}/browser_fields`,
      validate: {
        query: buildRouteValidation(
          t.exact(
            t.type({
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
        const { ruleTypeIds = [] } = request.query;

        const onlyO11yRuleTypeIds = (
          Array.isArray(ruleTypeIds) ? ruleTypeIds : [ruleTypeIds]
        ).filter((ruleTypeId) => !isSiemRuleType(ruleTypeId));

        const o11yIndices =
          (onlyO11yRuleTypeIds
            ? await alertsClient.getAuthorizedAlertsIndices(onlyO11yRuleTypeIds)
            : []) ?? [];

        if (o11yIndices.length === 0) {
          return response.notFound({
            body: {
              message: `No alerts-observability indices found for rule type ids [${onlyO11yRuleTypeIds}]`,
              attributes: { success: false },
            },
          });
        }

        const fields = await alertsClient.getBrowserFields({
          indices: o11yIndices,
          ruleTypeIds: onlyO11yRuleTypeIds,
          metaFields: ['_id', '_index'],
          allowNoIndex: true,
        });

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
