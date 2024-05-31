/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core-lifecycle-server';
import type { SecurityPluginSetup } from '@kbn/security-plugin/server';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';

import {
  getInitialTransformCapabilities,
  type Privilege,
  type Privileges,
  type PrivilegesAndCapabilities,
} from '../common/types/capabilities';
import { APP_CLUSTER_PRIVILEGES, APP_INDEX_PRIVILEGES } from '../common/constants';

import type { PluginStartDependencies } from './types';

export const TRANSFORM_PLUGIN_ID = 'transform' as const;

function isPrivileges(arg: unknown): arg is Privileges {
  return (
    isPopulatedObject(arg, ['hasAllPrivileges', 'missingPrivileges']) &&
    typeof arg.hasAllPrivileges === 'boolean' &&
    typeof arg.missingPrivileges === 'object' &&
    arg.missingPrivileges !== null
  );
}

export const hasPrivilegeFactory =
  (privileges: Privileges | undefined | null) => (privilege: Privilege) => {
    const [section, requiredPrivilege] = privilege;
    if (isPrivileges(privileges) && !privileges.missingPrivileges[section]) {
      // if the section does not exist in our missingPrivileges, everything is OK
      return true;
    }
    if (isPrivileges(privileges) && privileges.missingPrivileges[section]!.length === 0) {
      return true;
    }
    if (requiredPrivilege === '*') {
      // If length > 0 and we require them all... KO
      return false;
    }
    // If we require _some_ privilege, we make sure that the one
    // we require is *not* in the missingPrivilege array
    return (
      isPrivileges(privileges) &&
      !privileges.missingPrivileges[section]!.includes(requiredPrivilege)
    );
  };

export const extractMissingPrivileges = (
  privilegesObject: { [key: string]: boolean } = {}
): string[] =>
  Object.keys(privilegesObject).reduce((privileges: string[], privilegeName: string): string[] => {
    if (!privilegesObject[privilegeName]) {
      privileges.push(privilegeName);
    }
    return privileges;
  }, []);

export const getPrivilegesAndCapabilities = (
  clusterPrivileges: Record<string, boolean>,
  hasOneIndexWithAllPrivileges: boolean,
  hasAllPrivileges: boolean
): PrivilegesAndCapabilities => {
  const privilegesResult: Privileges = {
    hasAllPrivileges: true,
    missingPrivileges: {
      cluster: [],
      index: [],
    },
  };

  // Find missing cluster privileges and set overall app privileges
  privilegesResult.missingPrivileges.cluster = extractMissingPrivileges(clusterPrivileges);
  privilegesResult.hasAllPrivileges = hasAllPrivileges;

  if (!hasOneIndexWithAllPrivileges) {
    privilegesResult.missingPrivileges.index = [...APP_INDEX_PRIVILEGES];
  }

  const hasPrivilege = hasPrivilegeFactory(privilegesResult);

  const capabilities = getInitialTransformCapabilities();

  capabilities.canGetTransform =
    hasPrivilege(['cluster', 'cluster:monitor/transform/get']) &&
    hasPrivilege(['cluster', 'cluster:monitor/transform/stats/get']);

  capabilities.canCreateTransform = hasPrivilege(['cluster', 'cluster:admin/transform/put']);

  capabilities.canDeleteTransform = hasPrivilege(['cluster', 'cluster:admin/transform/delete']);

  capabilities.canResetTransform = hasPrivilege(['cluster', 'cluster:admin/transform/reset']);

  capabilities.canPreviewTransform = hasPrivilege(['cluster', 'cluster:admin/transform/preview']);

  capabilities.canStartStopTransform =
    hasPrivilege(['cluster', 'cluster:admin/transform/start']) &&
    hasPrivilege(['cluster', 'cluster:admin/transform/start_task']) &&
    hasPrivilege(['cluster', 'cluster:admin/transform/stop']);

  capabilities.canCreateTransformAlerts = capabilities.canCreateTransform;

  capabilities.canUseTransformAlerts = capabilities.canGetTransform;

  capabilities.canScheduleNowTransform = capabilities.canStartStopTransform;

  capabilities.canReauthorizeTransform = capabilities.canStartStopTransform;

  capabilities.canDeleteIndex = hasAllPrivileges;

  return { privileges: privilegesResult, capabilities };
};

export const setupCapabilities = (
  core: Pick<CoreSetup<PluginStartDependencies>, 'capabilities' | 'getStartServices'>,
  securitySetup?: SecurityPluginSetup
) => {
  core.capabilities.registerProvider(() => {
    return {
      transform: getInitialTransformCapabilities(),
    };
  });

  core.capabilities.registerSwitcher(
    async (request, capabilities, useDefaultCapabilities) => {
      if (useDefaultCapabilities) {
        return {};
      }

      const isSecurityPluginEnabled = securitySetup?.license.isEnabled() ?? false;
      const startServices = await core.getStartServices();
      const [, { security: securityStart }] = startServices;

      // If security is not enabled or not available, transform should have full permission
      if (!isSecurityPluginEnabled || !securityStart) {
        return {
          transform: getInitialTransformCapabilities(true),
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

      return {
        transform: transformCapabilities as Record<string, boolean | Record<string, boolean>>,
      };
    },
    {
      capabilityPath: 'transform.*',
    }
  );
};
