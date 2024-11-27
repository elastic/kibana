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

export const getBrowserFieldsByFeatureId = (router: IRouter<RacRequestHandlerContext>) => {
  router.get(
    {
      path: `${BASE_RAC_ALERTS_API_PATH}/browser_fields`,
      validate: {
        query: buildRouteValidation(
          t.exact(
            t.type({
              featureIds: t.union([t.string, t.array(t.string)]),
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
        const { featureIds = [] } = request.query;
        const onlyO11yFeatureIds = (Array.isArray(featureIds) ? featureIds : [featureIds]).filter(
          (fId) => fId !== 'siem'
        );

        // eslint-disable-next-line no-console
        console.log(
          'get_browser_fields_by_feature_id',
          'onlyO11yFeatureIds',
          JSON.stringify(onlyO11yFeatureIds, null, 4)
        );

        const o11yIndices =
          (onlyO11yFeatureIds
            ? await alertsClient.getAuthorizedAlertsIndices(onlyO11yFeatureIds)
            : []) ?? [];

        // eslint-disable-next-line no-console
        console.log(
          'get_browser_fields_by_feature_id',
          'o11yIndices',
          JSON.stringify(o11yIndices, null, 4)
        );

        if (o11yIndices.length === 0) {
          return response.notFound({
            body: {
              message: `No alerts-observability indices found for featureIds [${featureIds}]`,
              attributes: { success: false },
            },
          });
        }

        const fields = await alertsClient.getBrowserFields({
          indices: o11yIndices,
          featureIds: onlyO11yFeatureIds,
          metaFields: ['_id', '_index'],
          allowNoIndex: true,
        });

        // eslint-disable-next-line no-console
        console.log('get_browser_fields_by_feature_id', 'fields', fields?.fields?.length);

        // eslint-disable-next-line no-console
        console.log(
          'get_browser_fields_by_feature_id',
          'browserFields',
          Object.keys(fields?.browserFields)?.length
        );

        return response.ok({
          body: fields,
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.log('get_browser_fields_by_feature_id', 'error', JSON.stringify(error, null, 4));

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
