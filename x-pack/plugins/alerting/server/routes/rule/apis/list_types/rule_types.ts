/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import {
  TypesRulesResponseBodyV1,
  typesRulesResponseSchemaV1,
} from '../../../../../common/routes/rule/apis/list_types';
import { ILicenseState } from '../../../../lib';
import { verifyAccessAndContext } from '../../../lib';
import { AlertingRequestHandlerContext, BASE_ALERTING_API_PATH } from '../../../../types';
import { transformRuleTypesResponseV1 } from './transforms';

export const ruleTypesRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${BASE_ALERTING_API_PATH}/rule_types`,
      options: {
        access: 'public',
        summary: `Get the rule types`,
        tags: ['oas-tag:alerting'],
      },
      validate: {
        request: {},
        response: {
          200: {
            body: () => typesRulesResponseSchemaV1,
            description: 'Indicates a successful call.',
          },
          401: {
            description: 'Authorization information is missing or invalid.',
          },
        },
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesClient = (await context.alerting).getRulesClient();
        const ruleTypes = await rulesClient.listRuleTypes();

        const responseBody: TypesRulesResponseBodyV1 = transformRuleTypesResponseV1(ruleTypes);

        return res.ok({
          body: responseBody,
        });
      })
    )
  );
};
