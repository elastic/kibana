/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from 'kibana/server';
import { ILicenseState } from '../lib';
import { RegistryAlertTypeWithAuth } from '../authorization';
import { RewriteResponseCase, verifyAccessAndContext } from './lib';
import { AlertingRequestHandlerContext, BASE_ALERTING_API_PATH } from '../types';

const rewriteBodyRes: RewriteResponseCase<RegistryAlertTypeWithAuth[]> = (results) => {
  return results.map(
    ({
      enabledInLicense,
      recoveryActionGroup,
      actionGroups,
      defaultActionGroupId,
      minimumLicenseRequired,
      isExportable,
      actionVariables,
      authorizedConsumers,
      ...rest
    }) => ({
      ...rest,
      enabled_in_license: enabledInLicense,
      recovery_action_group: recoveryActionGroup,
      action_groups: actionGroups,
      default_action_group_id: defaultActionGroupId,
      minimum_license_required: minimumLicenseRequired,
      is_exportable: isExportable,
      action_variables: actionVariables,
      authorized_consumers: authorizedConsumers,
    })
  );
};

export const ruleTypesRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${BASE_ALERTING_API_PATH}/rule_types`,
      validate: {},
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const ruleTypes = Array.from(await context.alerting.getAlertsClient().listAlertTypes());
        return res.ok({
          body: rewriteBodyRes(ruleTypes),
        });
      })
    )
  );
};
