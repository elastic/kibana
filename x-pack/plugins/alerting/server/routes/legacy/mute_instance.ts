/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { UsageCounter } from 'src/plugins/usage_collection/server';
import type { AlertingRouter } from '../../types';
import { ILicenseState } from '../../lib/license_state';
import { verifyApiAccess } from '../../lib/license_api_access';
import { LEGACY_BASE_ALERT_API_PATH } from '../../../common';
import { renameKeys } from './../lib/rename_keys';
import { MuteOptions } from '../../rules_client';
import { RuleTypeDisabledError } from '../../lib/errors/rule_type_disabled';
import { trackLegacyRouteUsage } from '../../lib/track_legacy_route_usage';

const paramSchema = schema.object({
  alert_id: schema.string(),
  alert_instance_id: schema.string(),
});

export const muteAlertInstanceRoute = (
  router: AlertingRouter,
  licenseState: ILicenseState,
  usageCounter?: UsageCounter
) => {
  router.post(
    {
      path: `${LEGACY_BASE_ALERT_API_PATH}/alert/{alert_id}/alert_instance/{alert_instance_id}/_mute`,
      validate: {
        params: paramSchema,
      },
    },
    router.handleLegacyErrors(async function (context, req, res) {
      verifyApiAccess(licenseState);
      if (!context.alerting) {
        return res.badRequest({ body: 'RouteHandlerContext is not registered for alerting' });
      }

      trackLegacyRouteUsage('muteInstance', usageCounter);

      const rulesClient = context.alerting.getRulesClient();

      const renameMap = {
        alert_id: 'alertId',
        alert_instance_id: 'alertInstanceId',
      };

      const renamedQuery = renameKeys<MuteOptions, Record<string, unknown>>(renameMap, req.params);
      try {
        await rulesClient.muteInstance(renamedQuery);
        return res.noContent();
      } catch (e) {
        if (e instanceof RuleTypeDisabledError) {
          return e.sendResponse(res);
        }
        throw e;
      }
    })
  );
};
