/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { AlertingRequestHandlerContext, INTERNAL_BASE_ALERTING_API_PATH } from '../types';
import { ILicenseState } from '../lib';
import { RewriteResponseCase, RewriteRequestCase, verifyAccessAndContext } from './lib';
import {
  getRuleTagsAggregation,
  formatRuleTagsAggregationResult,
  RuleTagsAggregationOptions,
  RuleTagsAggregateResult,
  RuleTagsAggregation,
} from '../lib';

const querySchema = schema.object({
  filter: schema.maybe(schema.string()),
  search: schema.maybe(schema.string()),
  default_search_operator: schema.oneOf([schema.literal('OR'), schema.literal('AND')], {
    defaultValue: 'OR',
  }),
  search_fields: schema.maybe(schema.arrayOf(schema.string())),
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
  default_search_operator: defaultSearchOperator,
  search_fields: searchFields,
  ...rest
}) => ({
  ...rest,
  defaultSearchOperator,
  ...(maxTags ? { maxTags } : {}),
  ...(searchFields ? { searchFields } : {}),
});

const rewriteBodyRes: RewriteResponseCase<RuleTagsAggregateResult> = ({ ruleTags, ...rest }) => ({
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

        const aggregateResult = await rulesClient.aggregate<RuleTagsAggregation>({
          options,
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
