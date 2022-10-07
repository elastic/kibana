/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { RouteOptions } from '.';
import { BASE_ALERTING_API_PATH } from '../types';
import { handleDisabledApiKeysError, verifyAccessAndContext } from './lib';

export const bulkDeleteRulesRoute = ({ router, licenseState }: RouteOptions) => {
  router.patch(
    {
      path: `${BASE_ALERTING_API_PATH}/rules/_bulk_delete`,
      validate: {
        body: schema.object({
          filter: schema.maybe(schema.string()),
          ids: schema.maybe(schema.arrayOf(schema.string(), { minSize: 1 })),
        }),
      },
    },
    handleDisabledApiKeysError(
      router.handleLegacyErrors(
        verifyAccessAndContext(licenseState, async (context, req, res) => {
          const rulesClient = (await context.alerting).getRulesClient();
          const { filter, ids } = req.body;
          const result = await rulesClient.bulkDeleteRules({ filter, ids });
          return res.ok({ body: result });
        })
      )
    )
  );
};
