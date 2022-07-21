/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { schema } from '@kbn/config-schema';
import { ILicenseState } from '../lib';
import { FindOptions, FindResult } from '../rules_client';
import {
  RewriteRequestCase,
  RewriteResponseCase,
  verifyAccessAndContext,
  rewriteRule,
} from './lib';
import {
  RuleTypeParams,
  AlertingRequestHandlerContext,
  BASE_ALERTING_API_PATH,
  INTERNAL_BASE_ALERTING_API_PATH,
} from '../types';
import { trackLegacyTerminology } from './lib/track_legacy_terminology';

// query definition
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

const rewriteQueryReq: RewriteRequestCase<FindOptions> = ({
  default_search_operator: defaultSearchOperator,
  has_reference: hasReference,
  search_fields: searchFields,
  per_page: perPage,
  sort_field: sortField,
  sort_order: sortOrder,
  ...rest
}) => ({
  ...rest,
  defaultSearchOperator,
  perPage,
  ...(sortField ? { sortField } : {}),
  ...(sortOrder ? { sortOrder } : {}),
  ...(hasReference ? { hasReference } : {}),
  ...(searchFields ? { searchFields } : {}),
});
const rewriteBodyRes: RewriteResponseCase<FindResult<RuleTypeParams>> = ({
  perPage,
  data,
  ...restOfResult
}) => {
  return {
    ...restOfResult,
    per_page: perPage,
    data: data.map(rewriteRule),
  };
};

interface BuildFindRulesRouteParams {
  licenseState: ILicenseState;
  path: string;
  router: IRouter<AlertingRequestHandlerContext>;
  excludeFromPublicApi?: boolean;
  usageCounter?: UsageCounter;
}

const buildFindRulesRoute = ({
  licenseState,
  path,
  router,
  excludeFromPublicApi = false,
  usageCounter,
}: BuildFindRulesRouteParams) => {
  router.get(
    {
      path,
      validate: {
        query: querySchema,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesClient = (await context.alerting).getRulesClient();

        trackLegacyTerminology(
          [req.query.search, req.query.search_fields, req.query.sort_field].filter(
            Boolean
          ) as string[],
          usageCounter
        );

        const options = rewriteQueryReq({
          ...req.query,
          has_reference: req.query.has_reference || undefined,
          search_fields: searchFieldsAsArray(req.query.search_fields),
        });

        if (req.query.fields) {
          usageCounter?.incrementCounter({
            counterName: `alertingFieldsUsage`,
            counterType: 'alertingFieldsUsage',
            incrementBy: 1,
          });
        }

        const findResult = await rulesClient.find({
          options,
          excludeFromPublicApi,
          includeSnoozeData: true,
        });
        return res.ok({
          body: rewriteBodyRes(findResult),
        });
      })
    )
  );
};

export const findRulesRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState,
  usageCounter?: UsageCounter
) => {
  buildFindRulesRoute({
    excludeFromPublicApi: true,
    licenseState,
    path: `${BASE_ALERTING_API_PATH}/rules/_find`,
    router,
    usageCounter,
  });
};

export const findInternalRulesRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState,
  usageCounter?: UsageCounter
) => {
  buildFindRulesRoute({
    excludeFromPublicApi: false,
    licenseState,
    path: `${INTERNAL_BASE_ALERTING_API_PATH}/rules/_find`,
    router,
    usageCounter,
  });
};

function searchFieldsAsArray(searchFields: string | string[] | undefined): string[] | undefined {
  if (!searchFields) {
    return;
  }
  return Array.isArray(searchFields) ? searchFields : [searchFields];
}
