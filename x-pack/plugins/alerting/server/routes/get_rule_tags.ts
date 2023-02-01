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
  per_page: schema.number({ defaultValue: 10, min: 0 }),
  page: schema.number({ defaultValue: 1, min: 1 }),
  max_tags: schema.maybe(schema.number()),
});

const rewriteQueryReq: RewriteRequestCase<RuleTagsAggregationOptions> = ({
  per_page: perPage,
  max_tags: maxTags,
  ...rest
}) => ({
  ...rest,
  ...(perPage ? { perPage } : {}),
  ...(maxTags ? { maxTags } : {}),
});

const rewriteBodyRes: RewriteResponseCase<RuleTagsAggregateResult> = ({ ruleTags, ...rest }) => ({
  ...rest,
  rule_tags: ruleTags,
});

export const getRuleTags = (
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
          aggs: getRuleTagsAggregation(options.maxTags),
        });

        return res.ok({
          body: rewriteBodyRes(formatRuleTagsAggregationResult(aggregateResult)),
        });
      })
    )
  );
};
