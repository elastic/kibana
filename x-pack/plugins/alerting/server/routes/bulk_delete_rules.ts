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

const paramsSchema = schema.object({ ids: schema.arrayOf(schema.string(), { minSize: 1 }) });

export const bulkDeleteRulesRoute = ({ router, licenseState }: RouteOptions) => {
  router.delete(
    {
      path: `${BASE_ALERTING_API_PATH}/rules/_bulk_delete`,
      validate: { params: paramsSchema },
    },
    handleDisabledApiKeysError(
      router.handleLegacyErrors(
        verifyAccessAndContext(licenseState, async (context, req, res) => {
          const rulesClient = (await context.alerting).getRulesClient();
          const { ids } = req.params;
          return res.noContent();
        })
      )
    )
  );
};
