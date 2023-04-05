/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from '@kbn/core/server';
import { verifyAccessAndContext, handleDisabledApiKeysError } from './lib';
import { ILicenseState, RuleTypeDisabledError } from '../lib';
import { AlertingRequestHandlerContext, INTERNAL_BASE_ALERTING_API_PATH } from '../types';

export const bulkDisableRulesRoute = ({
  router,
  licenseState,
}: {
  router: IRouter<AlertingRequestHandlerContext>;
  licenseState: ILicenseState;
}) => {
  router.patch(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rules/_bulk_disable`,
      validate: {
        body: schema.object({
          filter: schema.maybe(schema.string()),
          ids: schema.maybe(schema.arrayOf(schema.string(), { minSize: 1, maxSize: 1000 })),
        }),
      },
    },
    handleDisabledApiKeysError(
      router.handleLegacyErrors(
        verifyAccessAndContext(licenseState, async (context, req, res) => {
          const rulesClient = (await context.alerting).getRulesClient();
          const { filter, ids } = req.body;

          try {
            const result = await rulesClient.bulkDisableRules({ filter, ids });
            return res.ok({ body: result });
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
