/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import {
  IRouter,
  RequestHandlerContext,
  KibanaRequest,
  IKibanaResponse,
  KibanaResponseFactory,
} from 'kibana/server';
import { LicenseState } from '../lib/license_state';
import { verifyApiAccess } from '../lib/license_api_access';
import { BASE_ALERT_API_PATH } from '../../common';
import { renameKeys } from './lib/rename_keys';
import { FindOptions } from '../alerts_client';

// config definition
const querySchema = schema.object({
  search: schema.maybe(schema.string()),
  default_search_operator: schema.oneOf([schema.literal('OR'), schema.literal('AND')], {
    defaultValue: 'OR',
  }),
  search_fields: schema.maybe(schema.oneOf([schema.arrayOf(schema.string()), schema.string()])),
  has_reference: schema.maybe(
    // use nullable as maybe is currently broken
    // in config-schema
    schema.nullable(
      schema.object({
        type: schema.string(),
        id: schema.string(),
      })
    )
  ),
  filter: schema.maybe(schema.string()),
});

export const aggregateAlertRoute = (router: IRouter, licenseState: LicenseState) => {
  router.get(
    {
      path: `${BASE_ALERT_API_PATH}/_aggregate`,
      validate: {
        query: querySchema,
      },
    },
    router.handleLegacyErrors(async function (
      context: RequestHandlerContext,
      req: KibanaRequest<unknown, TypeOf<typeof querySchema>, unknown>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse> {
      verifyApiAccess(licenseState);
      if (!context.alerting) {
        return res.badRequest({ body: 'RouteHandlerContext is not registered for alerting' });
      }
      const alertsClient = context.alerting.getAlertsClient();

      const query = req.query;
      const renameMap = {
        default_search_operator: 'defaultSearchOperator',
        has_reference: 'hasReference',
        search: 'search',
        filter: 'filter',
      };

      const options = renameKeys<FindOptions, Record<string, unknown>>(renameMap, query);

      if (query.search_fields) {
        options.searchFields = Array.isArray(query.search_fields)
          ? query.search_fields
          : [query.search_fields];
      }

      const aggregateResult = await alertsClient.aggregate({ options });
      return res.ok({
        body: aggregateResult,
      });
    })
  );
};
