/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IRouter } from '../../../../../src/core/server/http/router/router';
import { BASE_ALERTING_API_PATH } from '../../common';
import type { RegistryAlertTypeWithAuth } from '../authorization/alerting_authorization';
import type { ILicenseState } from '../lib/license_state';
import type { AlertingRequestHandlerContext } from '../types';
import type { RewriteResponseCase } from './lib/rewrite_request_case';
import { verifyAccessAndContext } from './lib/verify_access_and_context';

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
        const ruleTypes = Array.from(await context.alerting.getRulesClient().listAlertTypes());
        return res.ok({
          body: rewriteBodyRes(ruleTypes),
        });
      })
    )
  );
};
