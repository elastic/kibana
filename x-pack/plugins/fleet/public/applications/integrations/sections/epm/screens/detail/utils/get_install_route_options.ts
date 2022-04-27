/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CreatePackagePolicyRouteState } from '../../../../../types';
import { PLUGIN_ID, INTEGRATIONS_PLUGIN_ID, pagePathGetters } from '../../../../../constants';

/*
 * When the install package button is pressed, this fn decides which page to navigate to
 * by generating the options to be passed to `services.application.navigateToApp`.
 */
export const getInstallPkgRouteOptions = ({
  currentPath,
  integration,
  agentPolicyId,
  pkgkey,
}: {
  currentPath: string;
  integration: string | null;
  agentPolicyId?: string;
  pkgkey: string;
}): [string, { path: string; state: unknown }] => {
  const integrationOpts: { integration?: string } = integration ? { integration } : {};
  const path = pagePathGetters.add_integration_to_policy({
    pkgkey,
    ...integrationOpts,
    ...(agentPolicyId ? { agentPolicyId } : {}),
  })[1];

  let redirectToPath: CreatePackagePolicyRouteState['onSaveNavigateTo'] &
    CreatePackagePolicyRouteState['onCancelNavigateTo'];
  let onSaveQueryParams: CreatePackagePolicyRouteState['onSaveQueryParams'];
  if (agentPolicyId) {
    redirectToPath = [
      PLUGIN_ID,
      {
        path: pagePathGetters.policy_details({
          policyId: agentPolicyId,
        })[1],
      },
    ];

    onSaveQueryParams = {
      showAddAgentHelp: true,
      openEnrollmentFlyout: true,
    };
  } else {
    redirectToPath = [
      INTEGRATIONS_PLUGIN_ID,
      {
        path: pagePathGetters.integration_details_policies({
          pkgkey,
          ...integrationOpts,
        })[1],
      },
    ];

    onSaveQueryParams = {
      showAddAgentHelp: { renameKey: 'showAddAgentHelpForPolicyId', policyIdAsValue: true },
      openEnrollmentFlyout: { renameKey: 'addAgentToPolicyId', policyIdAsValue: true },
    };
  }

  const state: CreatePackagePolicyRouteState = {
    onSaveNavigateTo: redirectToPath,
    onSaveQueryParams,
    onCancelNavigateTo: [
      INTEGRATIONS_PLUGIN_ID,
      {
        path: pagePathGetters.integration_details_overview({
          pkgkey,
          ...integrationOpts,
        })[1],
      },
    ],
    onCancelUrl: currentPath,
  };

  return [PLUGIN_ID, { path, state }];
};
