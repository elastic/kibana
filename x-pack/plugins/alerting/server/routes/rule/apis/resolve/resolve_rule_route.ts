/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import { IRouter } from '@kbn/core/server';
import { RuleParamsV1 } from '../../../../../common/routes/rule/response';
import { ResolvedRule } from '../../../../application/rule/methods/resolve/types';
import {
  resolveParamsSchemaV1,
  ResolveRuleResponseV1,
} from '../../../../../common/routes/rule/apis/resolve';
import { ILicenseState } from '../../../../lib';
import { verifyAccessAndContext } from '../../../lib';
import { AlertingRequestHandlerContext, INTERNAL_BASE_ALERTING_API_PATH } from '../../../../types';
import { transformResolveResponseV1 } from './transforms';

export type ResolveRuleRequestParamsV1 = TypeOf<typeof resolveParamsSchemaV1>;

export const resolveRuleRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rule/{id}/_resolve`,
      options: { access: 'internal' },
      validate: {
        params: resolveParamsSchemaV1,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesClient = (await context.alerting).getRulesClient();
        const params: ResolveRuleRequestParamsV1 = req.params;
        const { id } = params;
        // TODO (http-versioning): Remove this cast, this enables us to move forward
        // without fixing all of other solution types
        const rule = (await rulesClient.resolve({
          id,
          includeSnoozeData: true,
        })) as ResolvedRule<RuleParamsV1>;
        const response: ResolveRuleResponseV1<RuleParamsV1> = {
          body: transformResolveResponseV1<RuleParamsV1>(rule),
        };
        return res.ok(response);
      })
    )
  );
};
