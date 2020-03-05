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
import { FindOptions } from '../../../alerting/server';
import { LicenseState } from '../lib/license_state';
import { verifyApiAccess } from '../lib/license_api_access';

// config definition
const querySchema = schema.object({
  per_page: schema.number({ defaultValue: 20, min: 0 }),
  page: schema.number({ defaultValue: 1, min: 1 }),
  search: schema.maybe(schema.string()),
  default_search_operator: schema.oneOf([schema.literal('OR'), schema.literal('AND')], {
    defaultValue: 'OR',
  }),
  search_fields: schema.maybe(schema.oneOf([schema.arrayOf(schema.string()), schema.string()])),
  sort_field: schema.maybe(schema.string()),
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
  fields: schema.maybe(schema.arrayOf(schema.string())),
  filter: schema.maybe(schema.string()),
});

export const findActionRoute = (router: IRouter, licenseState: LicenseState) => {
  router.get(
    {
      path: `/api/action/_find`,
      validate: {
        query: querySchema,
      },
      options: {
        tags: ['access:actions-read'],
      },
    },
    router.handleLegacyErrors(async function(
      context: RequestHandlerContext,
      req: KibanaRequest<any, TypeOf<typeof querySchema>, any, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> {
      verifyApiAccess(licenseState);
      const actionsClient = context.actions.getActionsClient();
      const query = req.query;
      const options: FindOptions['options'] = {
        perPage: query.per_page,
        page: query.page,
        search: query.search,
        defaultSearchOperator: query.default_search_operator,
        sortField: query.sort_field,
        fields: query.fields,
        filter: query.filter,
      };

      if (query.search_fields) {
        options.searchFields = Array.isArray(query.search_fields)
          ? query.search_fields
          : [query.search_fields];
      }

      if (query.has_reference) {
        options.hasReference = query.has_reference;
      }

      const findResult = await actionsClient.find({
        options,
      });
      return res.ok({
        body: findResult,
      });
    })
  );
};
