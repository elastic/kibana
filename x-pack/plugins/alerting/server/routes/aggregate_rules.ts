/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { UsageCounter } from '@kbn/usage-collection-plugin/server';
import type { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ILicenseState } from '../lib';
import { RewriteRequestCase, verifyAccessAndContext } from './lib';
import {
  AlertingRequestHandlerContext,
  INTERNAL_BASE_ALERTING_API_PATH,
  AggregateOptions,
} from '../types';
import { trackLegacyTerminology } from './lib/track_legacy_terminology';

// config definition
const querySchema = schema.object({
  aggs: schema.recordOf(schema.string(), schema.any()),
  search: schema.maybe(schema.string()),
  default_search_operator: schema.oneOf([schema.literal('OR'), schema.literal('AND')], {
    defaultValue: 'OR',
  }),
  search_fields: schema.maybe(schema.arrayOf(schema.string())),
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

const rewriteQueryReq: RewriteRequestCase<AggregateOptions & { aggs: Record<string, unknown> }> = ({
  default_search_operator: defaultSearchOperator,
  has_reference: hasReference,
  search_fields: searchFields,
  ...rest
}) => ({
  ...rest,
  defaultSearchOperator,
  ...(hasReference ? { hasReference } : {}),
  ...(searchFields ? { searchFields } : {}),
});

export const aggregateRulesRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState,
  usageCounter?: UsageCounter
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rules/_aggregate`,
      validate: {
        query: querySchema,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesClient = (await context.alerting).getRulesClient();
        const { aggs, ...options } = rewriteQueryReq({
          ...req.query,
          has_reference: req.query.has_reference || undefined,
        });
        trackLegacyTerminology(
          [req.query.search, req.query.search_fields].filter(Boolean) as string[],
          usageCounter
        );
        const aggregateResult = await rulesClient.aggregate({
          options,
          aggs: aggs as Record<string, AggregationsAggregationContainer>,
        });
        return res.ok({
          body: aggregateResult,
        });
      })
    )
  );
  router.post(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rules/_aggregate`,
      validate: {
        body: querySchema,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesClient = (await context.alerting).getRulesClient();
        const { aggs, ...options } = rewriteQueryReq({
          ...req.body,
          has_reference: req.body.has_reference || undefined,
        });
        trackLegacyTerminology(
          [req.body.search, req.body.search_fields].filter(Boolean) as string[],
          usageCounter
        );
        const aggregateResult = await rulesClient.aggregate({
          options,
          aggs: aggs as Record<string, AggregationsAggregationContainer>,
        });
        return res.ok({
          body: aggregateResult,
        });
      })
    )
  );
};
