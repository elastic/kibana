/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import {
  RuleTagsAggregationResult,
  RuleTagsAggregationFormattedResult,
  RuleTagsAggregationOptions,
  getRuleTagsAggregation,
  formatRuleTagsAggregationResult,
} from '../../common';
import { AlertingRequestHandlerContext, INTERNAL_BASE_ALERTING_API_PATH } from '../types';
import { ILicenseState } from '../lib';
import { RewriteResponseCase, RewriteRequestCase, verifyAccessAndContext } from './lib';

const querySchema = schema.object({
  filter: schema.maybe(schema.string()),
  search: schema.maybe(schema.string()),
  after: schema.maybe(
    schema.recordOf(
      schema.string(),
      schema.nullable(schema.oneOf([schema.string(), schema.number()]))
    )
  ),
  max_tags: schema.maybe(schema.number()),
});

const rewriteQueryReq: RewriteRequestCase<RuleTagsAggregationOptions> = ({
  max_tags: maxTags,
  ...rest
}) => ({
  ...rest,
  ...(maxTags ? { maxTags } : {}),
});

const rewriteBodyRes: RewriteResponseCase<RuleTagsAggregationFormattedResult> = ({
  ruleTags,
  ...rest
}) => ({
  ...rest,
  rule_tags: ruleTags,
});

export const getRuleTagsRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rules/_tags`,
      validate: {
        query: querySchema,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesClient = (await context.alerting).getRulesClient();
        const options = rewriteQueryReq(req.query);

        const aggregateResult = await rulesClient.aggregate<RuleTagsAggregationResult>({
          options: {
            ...options,
            defaultSearchOperator: 'AND',
            searchFields: ['tags'],
          },
          aggs: getRuleTagsAggregation({
            maxTags: options.maxTags,
            after: options.after,
          }),
        });

        return res.ok({
          body: rewriteBodyRes(formatRuleTagsAggregationResult(aggregateResult)),
        });
      })
    )
  );
};
