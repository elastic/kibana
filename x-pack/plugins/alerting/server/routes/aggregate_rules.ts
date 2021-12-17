/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from 'kibana/server';
import { schema } from '@kbn/config-schema';
import { UsageCounter } from 'src/plugins/usage_collection/server';
import { ILicenseState } from '../lib';
import { AggregateResult, AggregateOptions } from '../rules_client';
import { RewriteResponseCase, RewriteRequestCase, verifyAccessAndContext } from './lib';
import { AlertingRequestHandlerContext, INTERNAL_BASE_ALERTING_API_PATH } from '../types';
import { trackLegacyTerminology } from './lib/track_legacy_terminology';

// config definition
const querySchema = schema.object({
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
const rewriteBodyRes: RewriteResponseCase<AggregateResult> = ({
  alertExecutionStatus,
  ruleEnabledStatus,
  ruleMutedStatus,
  ...rest
}) => ({
  ...rest,
  rule_execution_status: alertExecutionStatus,
  rule_enabled_status: ruleEnabledStatus,
  rule_muted_status: ruleMutedStatus,
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
        const rulesClient = context.alerting.getRulesClient();
        const options = rewriteQueryReq({
          ...req.query,
          has_reference: req.query.has_reference || undefined,
        });
        trackLegacyTerminology(
          [req.query.search, req.query.search_fields].filter(Boolean) as string[],
          usageCounter
        );
        const aggregateResult = await rulesClient.aggregate({ options });
        return res.ok({
          body: rewriteBodyRes(aggregateResult),
        });
      })
    )
  );
};
