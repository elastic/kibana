/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { INTERNAL_BASE_ACTION_API_PATH } from '../../../common';
import { verifyAccessAndContext } from '../verify_access_and_context';
import { ActionsRequestHandlerContext } from '../../types';
import { ILicenseState } from '../../lib';

const paramsSchema = schema.object({
  connector_type_id: schema.string(),
});

export const getActionTemplates = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_ACTION_API_PATH}/templates/{connector_type_id}`,
      validate: {
        params: paramsSchema,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const actionTemplateClient = (await context.actions).getActionTemplateClient();
        return res.ok({
          body: await actionTemplateClient.getTemplates(
            decodeURIComponent(req.params.connector_type_id)
          ),
        });
      })
    )
  );
};
