/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core-lifecycle-server';
import {
  getPrivilegesAndCapabilities,
  INITIAL_CAPABILITIES,
} from '../common/privilege/has_privilege_factory';
import { APP_CLUSTER_PRIVILEGES } from '../common/constants';
import type { PluginStartDependencies } from './types';

export const TRANSFORM_PLUGIN_ID = 'transform' as const;

export const setupCapabilities = (
  core: Pick<CoreSetup<PluginStartDependencies>, 'capabilities' | 'getStartServices'>,
  isSecurityPluginEnabled: boolean
) => {
  core.capabilities.registerProvider(() => {
    return {
      transform: INITIAL_CAPABILITIES,
    };
  });

  core.capabilities.registerSwitcher(async (request, capabilities, useDefaultCapabilities) => {
    const fullTransformCapabilities = Object.keys(INITIAL_CAPABILITIES).reduce<
      Record<string, boolean>
    >((acc, p) => {
      acc[p] = true;
      return acc;
    }, {});
    // If security is not enabled, it should have full permission
    if (!isSecurityPluginEnabled)
      return {
        transform: fullTransformCapabilities,
      };

    if (useDefaultCapabilities) {
      return {};
    }

    const startServices = await core.getStartServices();
    const [, { security }] = startServices;

    // If security is not available, it should have full permission
    if (!security) {
      return {
        transform: fullTransformCapabilities,
      };
    }

    const checkPrivileges = security.authz.checkPrivilegesDynamicallyWithRequest(request);

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
