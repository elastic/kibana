/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { BASE_ACTION_API_PATH } from '../../../../common';
import {
  GetConnectorParamsV1,
  getConnectorParamsSchemaV1,
} from '../../../../common/routes/connector/apis/get';
import { ILicenseState } from '../../../lib';
import { ActionsRequestHandlerContext } from '../../../types';
import { verifyAccessAndContext } from '../../verify_access_and_context';
import { transformGetConnectorResponseV1 } from './transforms';

export const getConnectorRoute = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${BASE_ACTION_API_PATH}/connector/{id}`,
      validate: {
        params: getConnectorParamsSchemaV1,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const actionsClient = (await context.actions).getActionsClient();
        const { id }: GetConnectorParamsV1 = req.params;
        return res.ok({
          body: transformGetConnectorResponseV1(await actionsClient.get({ id })),
        });
      })
    )
  );
};
