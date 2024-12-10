/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { ILicenseState } from '../../../lib';
import { BASE_ACTION_API_PATH } from '../../../../common';
import { ActionsRequestHandlerContext } from '../../../types';
import { verifyAccessAndContext } from '../../verify_access_and_context';
import { connectorResponseSchemaV1 } from '../../../../common/routes/connector/response';
import {
  UpdateConnectorBodyV1,
  UpdateConnectorParamsV1,
  updateConnectorBodySchemaV1,
  updateConnectorParamsSchemaV1,
} from '../../../../common/routes/connector/apis/update';
import { transformUpdateConnectorResponseV1 } from './transforms';

export const updateConnectorRoute = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.put(
    {
      path: `${BASE_ACTION_API_PATH}/connector/{id}`,
      options: {
        access: 'public',
        summary: `Update a connector`,
        tags: ['oas-tag:connectors'],
      },
      validate: {
        request: {
          body: updateConnectorBodySchemaV1,
          params: updateConnectorParamsSchemaV1,
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
        const { id }: UpdateConnectorParamsV1 = req.params;
        const { name, config, secrets }: UpdateConnectorBodyV1 = req.body;

        return res.ok({
          body: transformUpdateConnectorResponseV1(
            await actionsClient.update({
              id,
              action: { name, config, secrets },
            })
          ),
        });
      })
    )
  );
};
