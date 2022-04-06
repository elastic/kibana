/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { DiagnoseOptions } from '../rules_client';
import { RewriteRequestCase, handleDisabledApiKeysError, verifyAccessAndContext } from './lib';
import { RuleTypeParams, INTERNAL_BASE_ALERTING_API_PATH, validateDurationSchema } from '../types';
import { RouteOptions } from '.';

export const bodySchema = schema.object({
  rule_type_id: schema.string(),
  consumer: schema.string(),
  params: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
  schedule: schema.object({
    interval: schema.string({ validate: validateDurationSchema }),
  }),
});

const rewriteBodyReq: RewriteRequestCase<DiagnoseOptions<RuleTypeParams>> = ({
  rule_type_id: ruleTypeId,
  ...rest
}) => ({
  ...rest,
  ruleTypeId,
});

export const previewRuleRoute = ({ router, licenseState }: RouteOptions) => {
  router.post(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rule/_preview`,
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
            body: await rulesClient.preview<RuleTypeParams>(rewriteBodyReq(rule)),
          });
        })
      )
    )
  );
};

export const diagnoseRuleRoute = ({ router, licenseState }: RouteOptions) => {
  router.get(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rule/{id}/_diagnose`,
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    handleDisabledApiKeysError(
      router.handleLegacyErrors(
        verifyAccessAndContext(licenseState, async function (context, req, res) {
          const rulesClient = context.alerting.getRulesClient();
          const { id } = req.params;

          return res.ok({
            body: await rulesClient.diagnose(id),
          });
        })
      )
    )
  );
};
