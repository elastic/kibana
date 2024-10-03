/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { ActionsRequestHandlerContext } from '../../../types';
import { ILicenseState } from '../../../lib';
import { BASE_ACTION_API_PATH } from '../../../../common';
import { verifyAccessAndContext } from '../../verify_access_and_context';
import { connectorResponseSchemaV1 } from '../../../../common/routes/connector/response';
import { transformConnectorResponseV1 } from '../common_transforms';
import {
  createConnectorRequestParamsSchemaV1,
  createConnectorRequestBodySchemaV1,
} from '../../../../common/routes/connector/apis/create';
import { transformCreateConnectorBodyV1 } from './transforms';

export const createConnectorRoute = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${BASE_ACTION_API_PATH}/connector/{id?}`,
      options: {
        access: 'public',
        summary: 'Create a connector',
        tags: ['oas-tag:connectors'],
      },
      validate: {
        request: {
          params: createConnectorRequestParamsSchemaV1,
          body: createConnectorRequestBodySchemaV1,
        },
        response: {
          200: {
            description: 'Indicates a successful call.',
            body: () => connectorResponseSchemaV1,
          },
        },
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const actionsClient = (await context.actions).getActionsClient();
        const action = transformCreateConnectorBodyV1(req.body);
        return res.ok({
          body: transformConnectorResponseV1(
            await actionsClient.create({ action, options: req.params })
          ),
        });
      })
    )
  );
};
