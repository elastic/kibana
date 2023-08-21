/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { AggregateOptions } from '../../../../application/rule/methods/aggregate';
import {
  DefaultRuleAggregationResult,
  formatDefaultAggregationResult,
  getDefaultRuleAggregation,
  RuleAggregationFormattedResult,
} from '../../../../../common';
import { ILicenseState } from '../../../../lib';
import { RewriteResponseCase, RewriteRequestCase, verifyAccessAndContext } from '../../../lib';
import { AlertingRequestHandlerContext, INTERNAL_BASE_ALERTING_API_PATH } from '../../../../types';
import { trackLegacyTerminology } from '../../../lib/track_legacy_terminology';
import {
  aggregateRulesRequestBodySchemaV1,
  AggregateRulesRequestBodyV1,
} from '../../../../../common/routes/rule/apis/aggregate';

const rewriteQueryReq: RewriteRequestCase<AggregateOptions> = ({
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
const rewriteBodyRes: RewriteResponseCase<RuleAggregationFormattedResult> = ({
  ruleExecutionStatus,
  ruleLastRunOutcome,
  ruleEnabledStatus,
  ruleMutedStatus,
  ruleSnoozedStatus,
  ruleTags,
  ...rest
}) => ({
  ...rest,
  rule_execution_status: ruleExecutionStatus,
  rule_last_run_outcome: ruleLastRunOutcome,
  rule_enabled_status: ruleEnabledStatus,
  rule_muted_status: ruleMutedStatus,
  rule_snoozed_status: ruleSnoozedStatus,
  rule_tags: ruleTags,
});

export const aggregateRulesRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState,
  usageCounter?: UsageCounter
) => {
  router.post(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rules/_aggregate`,
      validate: {
        body: aggregateRulesRequestBodySchemaV1,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesClient = (await context.alerting).getRulesClient();
        const body: AggregateRulesRequestBodyV1 = req.body;
        const options = rewriteQueryReq({
          ...body,
          has_reference: body.has_reference || undefined,
        });
        trackLegacyTerminology(
          [body.search, body.search_fields].filter(Boolean) as string[],
          usageCounter
        );
        const aggregateResult = await rulesClient.aggregate<DefaultRuleAggregationResult>({
          aggs: getDefaultRuleAggregation(),
          options,
        });
        return res.ok({
          body: rewriteBodyRes(formatDefaultAggregationResult(aggregateResult)),
        });
      })
    )
  );
};
