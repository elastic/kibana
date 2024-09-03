/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from '@kbn/core/server';
import { ILicenseState } from '../lib';
import { BASE_ACTION_API_PATH } from '../../common';
import { ActionsRequestHandlerContext } from '../types';
import { verifyAccessAndContext } from './verify_access_and_context';

const paramSchema = schema.object({
  id: schema.string({
    meta: { description: 'An identifier for the connector.' },
  }),
});

export const deleteActionRoute = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.delete(
    {
      path: `${BASE_ACTION_API_PATH}/connector/{id}`,
      options: {
        access: 'public',
        summary: `Delete a connector`,
        description: 'WARNING: When you delete a connector, it cannot be recovered.',
        tags: ['oas-tag:connectors'],
      },
      validate: {
        request: {
          params: paramSchema,
        },
        response: {
          204: {
            description: 'Indicates a successful call.',
          },
        },
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const actionsClient = (await context.actions).getActionsClient();
        const { id } = req.params;
        await actionsClient.delete({ id });
        return res.noContent();
      })
    )
  );
};
