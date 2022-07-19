/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { ILicenseState } from '../lib';
import { ActionType, BASE_ACTION_API_PATH, RewriteResponseCase } from '../../common';
import { ActionsRequestHandlerContext } from '../types';
import { verifyAccessAndContext } from './verify_access_and_context';

const querySchema = schema.object({
  feature_id: schema.maybe(schema.string()),
});

const rewriteBodyRes: RewriteResponseCase<ActionType[]> = (results) => {
  return results.map(
    ({
      enabledInConfig,
      enabledInLicense,
      minimumLicenseRequired,
      supportedFeatureIds,
      ...res
    }) => ({
      ...res,
      enabled_in_config: enabledInConfig,
      enabled_in_license: enabledInLicense,
      minimum_license_required: minimumLicenseRequired,
      supported_feature_ids: supportedFeatureIds,
    })
  );
};

export const connectorTypesRoute = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${BASE_ACTION_API_PATH}/connector_types`,
      validate: {
        query: querySchema,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const actionsClient = (await context.actions).getActionsClient();
        return res.ok({
          body: rewriteBodyRes(await actionsClient.listTypes(req.query?.feature_id)),
        });
      })
    )
  );
};
