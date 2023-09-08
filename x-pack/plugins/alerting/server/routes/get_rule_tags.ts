/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { AlertingRequestHandlerContext, INTERNAL_BASE_ALERTING_API_PATH } from '../types';
import { ILicenseState } from '../lib';
import { RewriteResponseCase, RewriteRequestCase, verifyAccessAndContext } from './lib';
import {
  DEFAULT_TAGS_PER_PAGE,
  GetTagsParams,
  GetTagsResult,
} from '../rules_client/methods/get_tags';

const querySchema = schema.object({
  page: schema.number({ defaultValue: 1, min: 1 }),
  per_page: schema.maybe(schema.number({ defaultValue: DEFAULT_TAGS_PER_PAGE, min: 1 })),
  search: schema.maybe(schema.string()),
});

const rewriteQueryReq: RewriteRequestCase<GetTagsParams> = ({ per_page: perPage, ...rest }) => ({
  ...rest,
  perPage,
});

const rewriteBodyRes: RewriteResponseCase<GetTagsResult> = ({ perPage, ...rest }) => ({
  ...rest,
  per_page: perPage,
});

export const getRuleTagsRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rules/_tags`,
      validate: {
        query: querySchema,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesClient = (await context.alerting).getRulesClient();
        const options = rewriteQueryReq(req.query);

        const tagsResult = await rulesClient.getTags(options);

        return res.ok({
          body: rewriteBodyRes(tagsResult),
        });
      })
    )
  );
};
