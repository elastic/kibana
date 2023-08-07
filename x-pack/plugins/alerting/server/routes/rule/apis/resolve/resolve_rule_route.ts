/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { resolveParamsSchemaV1 } from '../../../../../common/routes/rule/apis/resolve';
import { ILicenseState } from '../../../../lib';
import { verifyAccessAndContext } from '../../../lib';
import { AlertingRequestHandlerContext, INTERNAL_BASE_ALERTING_API_PATH } from '../../../../types';
import { Rule } from '../../../../application/rule/types';
import type { RuleParamsV1 } from '../../../../../common/routes/rule/response';
import { transformRuleToRuleResponseV1 } from '../../transforms';

export const resolveRuleRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rule/{id}/_resolve`,
      validate: {
        params: resolveParamsSchemaV1,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesClient = (await context.alerting).getRulesClient();
        const { id } = req.params;
        const rule = await rulesClient.resolve({
          id,
          includeSnoozeData: true,
        });
        return res.ok({
          body: transformRuleToRuleResponseV1(rule as Rule<RuleParamsV1>),
        });
      })
    )
  );
};
