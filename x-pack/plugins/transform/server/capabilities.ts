/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from '@kbn/core-lifecycle-server';
import { APP_CLUSTER_PRIVILEGES } from '../common/constants';
import { PluginStartDependencies } from './types';
import { Capabilities } from '../public/app/lib/authorization/components/common';

export const TRANSFORM_PLUGIN_ID = 'transform' as const;

export const initialCapabilities: Capabilities = {
  canGetTransform: false,
  canDeleteTransform: false,
  canPreviewTransform: false,
  canCreateTransform: false,
  canStartStopTransform: false,
  canCreateTransformAlerts: false,
  canUseTransformAlerts: false,
  canResetTransform: false,
};

function getAuthorizationFromPrivileges(
  kibanaPrivileges: Array<{
    resource?: string;
    privilege: string;
    authorized: boolean;
  }>,
  prefix: string,
  searchPrivilege: string
): boolean {
  const privilege = kibanaPrivileges.find((p) =>
    p.privilege.endsWith(`${prefix}${searchPrivilege}`)
  );
  return privilege?.authorized || false;
}

export const setupCapabilities = (
  core: Pick<CoreSetup<PluginStartDependencies>, 'capabilities' | 'getStartServices'>
) => {
  // @TODO: Replace this with checks from authorization provider
  // x-pack/plugins/transform/public/app/lib/authorization/components/authorization_provider.tsx
  core.capabilities.registerProvider(() => {
    return {
      transform: initialCapabilities,
    };
  });

  core.capabilities.registerSwitcher(async (request, capabilities, useDefaultCapabilities) => {
    if (useDefaultCapabilities) {
      return capabilities;
    }
    const [, { security }] = await core.getStartServices();
    if (!security) {
      return capabilities;
    }

    const checkPrivileges = security?.authz.checkPrivilegesDynamicallyWithRequest(request);

    const { privileges } = await checkPrivileges({
      elasticsearch: {
        cluster: APP_CLUSTER_PRIVILEGES,
        // index: APP_INDEX_PRIVILEGES,
      },
      kibana: [
        security.authz.actions.api.get(`${TRANSFORM_PLUGIN_ID}-all`),
        security.authz.actions.api.get(`${TRANSFORM_PLUGIN_ID}-admin`),
        security.authz.actions.api.get(`${TRANSFORM_PLUGIN_ID}-read`),
      ],
    });
    // @TODO: Replace this with elasticsearch cluster permission check
    const kibanaPrivileges = privileges.kibana;
    const transformCapabilities = {
      canGetTransform: getAuthorizationFromPrivileges(
        kibanaPrivileges,
        `${TRANSFORM_PLUGIN_ID}-`,
        `read`
      ),
      canViewTransform: getAuthorizationFromPrivileges(
        kibanaPrivileges,
        `${TRANSFORM_PLUGIN_ID}-`,
        `read`
      ),
      canPreviewTransform: getAuthorizationFromPrivileges(
        kibanaPrivileges,
        `${TRANSFORM_PLUGIN_ID}-`,
        `read`
      ),

      canCreateTransform: getAuthorizationFromPrivileges(
        kibanaPrivileges,
        `${TRANSFORM_PLUGIN_ID}-`,
        `admin`
      ),
      canDeleteTransform: getAuthorizationFromPrivileges(
        kibanaPrivileges,
        `${TRANSFORM_PLUGIN_ID}-`,
        `admin`
      ),
      canStartStopTransform: getAuthorizationFromPrivileges(
        kibanaPrivileges,
        `${TRANSFORM_PLUGIN_ID}-`,
        'admin'
      ),
    };
    return { ...capabilities, transform: transformCapabilities };
  });
};
