/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { UsageCounter } from '@kbn/usage-collection-plugin/server';
import type { AlertingRouter } from '../../types';

import { ILicenseState } from '../../lib/license_state';
import { verifyApiAccess } from '../../lib/license_api_access';
import { LEGACY_BASE_ALERT_API_PATH } from '../../../common';
import { renameKeys } from '../lib/rename_keys';
import { FindOptions } from '../../rules_client';
import { trackLegacyRouteUsage } from '../../lib/track_legacy_route_usage';
import { trackLegacyTerminology } from '../lib/track_legacy_terminology';

// config definition
const querySchema = schema.object({
  per_page: schema.number({ defaultValue: 10, min: 0 }),
  page: schema.number({ defaultValue: 1, min: 1 }),
  search: schema.maybe(schema.string()),
  default_search_operator: schema.oneOf([schema.literal('OR'), schema.literal('AND')], {
    defaultValue: 'OR',
  }),
  search_fields: schema.maybe(schema.oneOf([schema.arrayOf(schema.string()), schema.string()])),
  sort_field: schema.maybe(schema.string()),
  sort_order: schema.maybe(schema.oneOf([schema.literal('asc'), schema.literal('desc')])),
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

export const findAlertRoute = (
  router: AlertingRouter,
  licenseState: ILicenseState,
  usageCounter?: UsageCounter
) => {
  router.get(
    {
      path: `${LEGACY_BASE_ALERT_API_PATH}/_find`,
      validate: {
        query: querySchema,
      },
    },
    router.handleLegacyErrors(async function (context, req, res) {
      verifyApiAccess(licenseState);
      if (!context.alerting) {
        return res.badRequest({ body: 'RouteHandlerContext is not registered for alerting' });
      }
      trackLegacyRouteUsage('find', usageCounter);
      trackLegacyTerminology(
        [req.query.search, req.query.search_fields, req.query.sort_field].filter(
          Boolean
        ) as string[],
        usageCounter
      );
      const rulesClient = context.alerting.getRulesClient();

      const query = req.query;
      const renameMap = {
        default_search_operator: 'defaultSearchOperator',
        fields: 'fields',
        has_reference: 'hasReference',
        page: 'page',
        per_page: 'perPage',
        search: 'search',
        sort_field: 'sortField',
        sort_order: 'sortOrder',
        filter: 'filter',
      };

      const options = renameKeys<FindOptions, Record<string, unknown>>(renameMap, query);

      if (query.search_fields) {
        options.searchFields = Array.isArray(query.search_fields)
          ? query.search_fields
          : [query.search_fields];
      }

      if (query.fields) {
        usageCounter?.incrementCounter({
          counterName: `legacyAlertingFieldsUsage`,
          counterType: 'alertingFieldsUsage',
          incrementBy: 1,
        });
      }

      const findResult = await rulesClient.find({ options, excludeFromPublicApi: true });
      return res.ok({
        body: findResult,
      });
    })
  );
};
