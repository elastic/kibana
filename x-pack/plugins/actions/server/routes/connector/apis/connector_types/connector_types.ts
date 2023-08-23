/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import {
  connectorTypesQuerySchemaV1,
  type ConnectorTypesRequestQueryV1,
} from '../../../../../common/routes/connector/apis/connector_types';
import { ILicenseState } from '../../../../lib';
import { BASE_ACTION_API_PATH } from '../../../../../common';
import { ActionsRequestHandlerContext } from '../../../../types';
import { verifyAccessAndContext } from '../../../verify_access_and_context';

// const rewriteBodyRes: RewriteResponseCase<ActionType[]> = (results) => {
//   return results.map(
//     ({
//       enabledInConfig,
//       enabledInLicense,
//       minimumLicenseRequired,
//       supportedFeatureIds,
//       isSystemActionType,
//       ...res
//     }) => ({
//       ...res,
//       enabled_in_config: enabledInConfig,
//       enabled_in_license: enabledInLicense,
//       minimum_license_required: minimumLicenseRequired,
//       supported_feature_ids: supportedFeatureIds,
//       is_system_action_type: isSystemActionType,
//     })
//   );
// };

export const connectorTypesRoute = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${BASE_ACTION_API_PATH}/connector_types`,
      validate: {
        query: connectorTypesQuerySchemaV1,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const actionsClient = (await context.actions).getActionsClient();

        // Assert versioned inputs
        const query: ConnectorTypesRequestQueryV1 = req.query;

        const connectorTypes = await actionsClient.listTypes({ featureId: req.query?.feature_id });

        const response: ConnectorTypesResponseV1<any> = {
          body: transformConnectorTypesToSomethingElse<any>(connectorTypes),
        };

        return res.ok(response);
      })
    )
  );
};
