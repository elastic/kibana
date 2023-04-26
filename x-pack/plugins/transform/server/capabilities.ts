/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core-lifecycle-server';
import { SecurityPluginSetup } from '@kbn/security-plugin/server';
import {
  getPrivilegesAndCapabilities,
  INITIAL_CAPABILITIES,
} from '../common/privilege/has_privilege_factory';
import { APP_CLUSTER_PRIVILEGES } from '../common/constants';
import type { PluginStartDependencies } from './types';

export const TRANSFORM_PLUGIN_ID = 'transform' as const;

export const setupCapabilities = (
  core: Pick<CoreSetup<PluginStartDependencies>, 'capabilities' | 'getStartServices'>,
  securitySetup?: SecurityPluginSetup
) => {
  core.capabilities.registerProvider(() => {
    return {
      transform: INITIAL_CAPABILITIES,
    };
  });

  core.capabilities.registerSwitcher(async (request, capabilities, useDefaultCapabilities) => {
    if (useDefaultCapabilities) {
      return {};
    }

    const isSecurityPluginEnabled = securitySetup?.license.isEnabled() ?? false;
    const startServices = await core.getStartServices();
    const [, { security: securityStart }] = startServices;

    // If security is not enabled or not available, transform should have full permission
    if (!isSecurityPluginEnabled || !securityStart) {
      return {
        transform: Object.keys(INITIAL_CAPABILITIES).reduce<Record<string, boolean>>((acc, p) => {
          acc[p] = true;
          return acc;
        }, {}),
      };
    }

    const checkPrivileges = securityStart.authz.checkPrivilegesDynamicallyWithRequest(request);

    const { hasAllRequested, privileges } = await checkPrivileges({
      elasticsearch: {
        cluster: APP_CLUSTER_PRIVILEGES,
        index: {},
      },
    });

    const clusterPrivileges: Record<string, boolean> = Array.isArray(
      privileges?.elasticsearch?.cluster
    )
      ? privileges.elasticsearch.cluster.reduce<Record<string, boolean>>((acc, p) => {
          acc[p.privilege] = p.authorized;
          return acc;
        }, {})
      : {};

    const hasOneIndexWithAllPrivileges = false;

    const transformCapabilities = getPrivilegesAndCapabilities(
      clusterPrivileges,
      hasOneIndexWithAllPrivileges,
      hasAllRequested
    ).capabilities;

    return { transform: transformCapabilities };
  });
};
