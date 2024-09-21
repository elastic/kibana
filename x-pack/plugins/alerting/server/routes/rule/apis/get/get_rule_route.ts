/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter, RouteConfigOptions, RouteMethod } from '@kbn/core/server';
import { ILicenseState } from '../../../../lib';
import { verifyAccessAndContext } from '../../../lib';
import { RuleParamsV1, ruleResponseSchemaV1 } from '../../../../../common/routes/rule/response';
import { Rule } from '../../../../application/rule/types';
import {
  AlertingRequestHandlerContext,
  BASE_ALERTING_API_PATH,
  INTERNAL_BASE_ALERTING_API_PATH,
} from '../../../../types';
import { transformRuleToRuleResponseV1 } from '../../transforms';

import type {
  GetRuleRequestParamsV1,
  GetRuleResponseV1,
} from '../../../../../common/routes/rule/apis/get';
import { getRuleRequestParamsSchemaV1 } from '../../../../../common/routes/rule/apis/get';

interface BuildGetRulesRouteParams {
  licenseState: ILicenseState;
  path: string;
  router: IRouter<AlertingRequestHandlerContext>;
  excludeFromPublicApi?: boolean;
  options?: RouteConfigOptions<RouteMethod>;
}
const buildGetRuleRoute = ({
  licenseState,
  path,
  router,
  excludeFromPublicApi = false,
  options,
}: BuildGetRulesRouteParams) => {
  router.get(
    {
      path,
      options,
      validate: {
        request: {
          params: getRuleRequestParamsSchemaV1,
        },
        response: {
          200: {
            body: () => ruleResponseSchemaV1,
            description: 'Indicates a successful call.',
          },
          400: {
            description: 'Indicates an invalid schema or parameters.',
          },
          403: {
            description: 'Indicates that this call is forbidden.',
          },
          404: {
            description: 'Indicates a rule with the given ID does not exist.',
          },
        },
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const alertingContext = await context.alerting;
        const rulesClient = await alertingContext.getRulesClient();
        const params: GetRuleRequestParamsV1 = req.params;

        // TODO (http-versioning): Remove this cast, this enables us to move forward
        // without fixing all of other solution types
        const rule: Rule<RuleParamsV1> = (await rulesClient.get({
          id: params.id,
          excludeFromPublicApi,
          includeSnoozeData: true,
        })) as Rule<RuleParamsV1>;

        const response: GetRuleResponseV1<RuleParamsV1> = {
          body: transformRuleToRuleResponseV1<RuleParamsV1>(rule),
        };
        return res.ok(response);
      })
    )
  );
};

export const getRuleRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) =>
  buildGetRuleRoute({
    excludeFromPublicApi: true,
    licenseState,
    path: `${BASE_ALERTING_API_PATH}/rule/{id}`,
    router,
    options: {
      access: 'public',
      summary: `Get rule details`,
      tags: ['oas-tag:alerting'],
    },
  });

export const getInternalRuleRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) =>
  buildGetRuleRoute({
    excludeFromPublicApi: false,
    licenseState,
    path: `${INTERNAL_BASE_ALERTING_API_PATH}/rule/{id}`,
    router,
  });
