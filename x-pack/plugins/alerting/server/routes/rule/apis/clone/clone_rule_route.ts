/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { ILicenseState, RuleTypeDisabledError } from '../../../../lib';
import { verifyAccessAndContext, handleDisabledApiKeysError } from '../../../lib';
import { AlertingRequestHandlerContext, INTERNAL_BASE_ALERTING_API_PATH } from '../../../../types';
import {
  cloneRuleRequestParamsSchemaV1,
  CloneRuleRequestParamsV1,
  CloneRuleResponseV1,
} from '../../../../../common/routes/rule/apis/clone';
import type { RuleParamsV1 } from '../../../../../common/routes/rule/response';
import { Rule } from '../../../../application/rule/types';
import { transformRuleToRuleResponseV1 } from '../../transforms';

export const cloneRuleRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rule/{id}/_clone/{newId?}`,
      validate: {
        params: cloneRuleRequestParamsSchemaV1,
      },
    },
    handleDisabledApiKeysError(
      router.handleLegacyErrors(
        verifyAccessAndContext(licenseState, async function (context, req, res) {
          const rulesClient = (await context.alerting).getRulesClient();
          const params: CloneRuleRequestParamsV1 = req.params;
          try {
            // TODO (http-versioning): Remove this cast, this enables us to move forward
            // without fixing all of other solution types
            const cloneRule: Rule<RuleParamsV1> = (await rulesClient.clone({
              id: params.id,
              newId: params.newId,
            })) as Rule<RuleParamsV1>;

            const response: CloneRuleResponseV1<RuleParamsV1> = {
              body: transformRuleToRuleResponseV1<RuleParamsV1>(cloneRule),
            };

            return res.ok(response);
          } catch (e) {
            if (e instanceof RuleTypeDisabledError) {
              return e.sendResponse(res);
            }
            throw e;
          }
        })
      )
    )
  );
};
