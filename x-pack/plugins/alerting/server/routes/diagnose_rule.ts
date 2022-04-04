/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { DiagnoseOptions } from '../rules_client';
import { RewriteRequestCase, handleDisabledApiKeysError, verifyAccessAndContext } from './lib';
import { RuleTypeParams, INTERNAL_BASE_ALERTING_API_PATH } from '../types';
import { RouteOptions } from '.';

export const bodySchema = schema.object({
  rule_type_id: schema.string(),
  params: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
});

const rewriteBodyReq: RewriteRequestCase<DiagnoseOptions<RuleTypeParams>> = ({
  rule_type_id: ruleTypeId,
  ...rest
}) => ({
  ...rest,
  ruleTypeId,
});

export const diagnoseRuleRoute = ({ router, licenseState, usageCounter }: RouteOptions) => {
  router.post(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rule/_diagnose`,
      validate: {
        body: bodySchema,
      },
    },
    handleDisabledApiKeysError(
      router.handleLegacyErrors(
        verifyAccessAndContext(licenseState, async function (context, req, res) {
          const rulesClient = context.alerting.getRulesClient();
          const rule = req.body;

          return res.ok({
            body: await rulesClient.diagnose<RuleTypeParams>(rewriteBodyReq(rule)),
          });
        })
      )
    )
  );
};
