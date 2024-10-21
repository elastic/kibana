/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { ConnectorTypesResponseV1 } from '../../../../common/routes/connector/response';
import {
  connectorTypesQuerySchemaV1,
  ConnectorTypesRequestQueryV1,
} from '../../../../common/routes/connector/apis/connector_types';
import { ActionsRequestHandlerContext } from '../../../types';
import { INTERNAL_BASE_ACTION_API_PATH } from '../../../../common';
import { ILicenseState } from '../../../lib';
import { verifyAccessAndContext } from '../../verify_access_and_context';
import { transformListTypesResponseV1 } from '../list_types/transforms';

export const listTypesWithSystemRoute = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_ACTION_API_PATH}/connector_types`,
      validate: {
        query: connectorTypesQuerySchemaV1,
      },
      options: {
        access: 'internal',
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const actionsClient = (await context.actions).getActionsClient();

        // Assert versioned inputs
        const query: ConnectorTypesRequestQueryV1 = req.query;

        const connectorTypes = await actionsClient.listTypes({
          featureId: query?.feature_id,
          includeSystemActionTypes: true,
        });

        const responseBody: ConnectorTypesResponseV1[] =
          transformListTypesResponseV1(connectorTypes);

        return res.ok({ body: responseBody });
      })
    )
  );
};
