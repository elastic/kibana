/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from 'kibana/server';
import { ILicenseState } from '../lib';
import { verifyAccessAndContext } from './lib';
import { AlertingRequestHandlerContext, INTERNAL_BASE_ALERTING_API_PATH } from '../types';

const paramSchema = schema.object({
  id: schema.string(),
});

interface BuildGetRulesRouteParams {
  licenseState: ILicenseState;
  path: string;
  router: IRouter<AlertingRequestHandlerContext>;
  excludeFromPublicApi?: boolean;
}
const buildGetEventLogsFieldCapsRoute = ({
  licenseState,
  path,
  router,
  excludeFromPublicApi = false,
}: BuildGetRulesRouteParams) => {
  router.get(
    {
      path,
      validate: {
        params: paramSchema,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesClient = context.alerting.getRulesClient();
        const { id } = req.params;
        const eventLogsFieldCaps = await rulesClient.getEventLogsFieldCaps(id);
        return res.ok({
          body: eventLogsFieldCaps,
        });
      })
    )
  );
};

export const getInternalGetEventLogsFieldCapsRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) =>
  buildGetEventLogsFieldCapsRoute({
    excludeFromPublicApi: false,
    licenseState,
    path: `${INTERNAL_BASE_ALERTING_API_PATH}/rule/{id}/logs/_field_caps`,
    router,
  });
