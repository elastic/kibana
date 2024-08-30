/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { IRouter } from '@kbn/core/server';
import { transformRuleTagsBodyResponseV1 } from './transforms';
import { transformRuleTagsQueryRequestV1 } from './transforms';
import {
  ruleTagsRequestQuerySchemaV1,
  RuleTagsRequestQueryV1,
} from '../../../schemas/rule/apis/tags';
import { AlertingRequestHandlerContext, INTERNAL_BASE_ALERTING_API_PATH } from '../../../../types';
import { ILicenseState } from '../../../../lib';
import { verifyAccessAndContext } from '../../../lib';

export const getRuleTagsRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rules/_tags`,
      validate: {
        query: ruleTagsRequestQuerySchemaV1,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesClient = (await context.alerting).getRulesClient();
        const query: RuleTagsRequestQueryV1 = req.query;

        const options = transformRuleTagsQueryRequestV1(query);

        const tagsResult = await rulesClient.getTags(options);

        return res.ok({
          body: transformRuleTagsBodyResponseV1(tagsResult),
        });
      })
    )
  );
};
