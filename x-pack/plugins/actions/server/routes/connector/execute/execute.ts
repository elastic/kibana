/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { ILicenseState } from '../../../lib';

import { ActionTypeExecutorResult, ActionsRequestHandlerContext } from '../../../types';
import { BASE_ACTION_API_PATH } from '../../../../common';
import { asHttpRequestExecutionSource } from '../../../lib/action_execution_source';
import { verifyAccessAndContext } from '../../verify_access_and_context';
import { connectorResponseSchemaV1 } from '../../../../common/routes/connector/response';
import {
  executeConnectorRequestBodySchemaV1,
  ExecuteConnectorRequestBodyV1,
  executeConnectorRequestParamsSchemaV1,
  ExecuteConnectorRequestParamsV1,
} from '../../../../common/routes/connector/apis/execute';
import { transformExecuteConnectorResponseV1 } from './transforms';

export const executeConnectorRoute = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${BASE_ACTION_API_PATH}/connector/{id}/_execute`,
      options: {
        access: 'public',
        summary: `Run a connector`,
        description:
          'You can use this API to test an action that involves interaction with Kibana services or integrations with third-party systems.',
        tags: ['oas-tag:connectors'],
      },
      validate: {
        request: {
          body: executeConnectorRequestBodySchemaV1,
          params: executeConnectorRequestParamsSchemaV1,
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
        const { params }: ExecuteConnectorRequestBodyV1 = req.body;
        const { id }: ExecuteConnectorRequestParamsV1 = req.params;

        if (actionsClient.isSystemAction(id)) {
          return res.badRequest({ body: 'Execution of system action is not allowed' });
        }

        const body: ActionTypeExecutorResult<unknown> = await actionsClient.execute({
          params,
          actionId: id,
          source: asHttpRequestExecutionSource(req),
          relatedSavedObjects: [],
        });

        return body
          ? res.ok({
              body: transformExecuteConnectorResponseV1(body),
            })
          : res.noContent();
      })
    )
  );
};
