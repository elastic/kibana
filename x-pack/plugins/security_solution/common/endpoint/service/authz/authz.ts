/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ENDPOINT_PRIVILEGES, FleetAuthz } from '@kbn/fleet-plugin/common';
import type { Capabilities } from '@kbn/core-capabilities-common';

import type { LicenseService } from '../../../license';
import type { EndpointPermissions, EndpointAuthz } from '../../types/authz';
import type { MaybeImmutable } from '../../types';

export function defaultEndpointPermissions(): EndpointPermissions {
  return {
    canWriteSecuritySolution: false,
    canReadSecuritySolution: false,
  };
}

/**
 * Checks to see if a given Kibana privilege was granted.
 * Note that this only checks if the user has the privilege as part of their role. That
 * does not indicate that the user has the granted functionality behind that privilege
 * (ex. due to license level). To get an accurate representation of user's authorization
 * level, use `calculateEndpointAuthz()`
 *
 * @param fleetAuthz
 * @param isEndpointRbacEnabled
 * @param isSuperuser
 * @param privilege
 */
export function hasKibanaPrivilege(
  fleetAuthz: FleetAuthz,
  isEndpointRbacEnabled: boolean,
  isSuperuser: boolean,
  privilege: typeof ENDPOINT_PRIVILEGES[number]
): boolean {
  // user is superuser, always return true
  if (isSuperuser) {
    return true;
  }

  // not superuser and FF not enabled, no access
  if (!isEndpointRbacEnabled) {
    return false;
  }

  // FF enabled, access based on privileges
  return fleetAuthz.packagePrivileges?.endpoint?.actions[privilege].executePackageAction ?? false;
}

/**
 * Used by both the server and the UI to generate the Authorization for access to Endpoint related
 * functionality
 *
 * @param licenseService
 * @param fleetAuthz
 * @param userRoles
 * @param isEndpointRbacEnabled
 * @param permissions
 * @param hasHostIsolationExceptionsItems if set to `true`, then Host Isolation Exceptions related authz properties
 * may be adjusted to account for a license downgrade scenario
 */

// eslint-disable-next-line complexity
export const calculateEndpointAuthz = (
  licenseService: LicenseService,
  fleetAuthz: FleetAuthz,
  userRoles: MaybeImmutable<string[]>,
  isEndpointRbacEnabled: boolean = false,
  permissions: Partial<EndpointPermissions> = defaultEndpointPermissions(),
  hasHostIsolationExceptionsItems: boolean = false
): EndpointAuthz => {
  const isPlatinumPlusLicense = licenseService.isPlatinumPlus();
  const isEnterpriseLicense = licenseService.isEnterprise();
  const hasEndpointManagementAccess = userRoles.includes('superuser');
  const { canWriteSecuritySolution = false, canReadSecuritySolution = false } = permissions;
  const canWriteEndpointList = hasKibanaPrivilege(
    fleetAuthz,
    isEndpointRbacEnabled,
    hasEndpointManagementAccess,
    'writeEndpointList'
  );
  const canReadEndpointList =
    canWriteEndpointList ||
    hasKibanaPrivilege(
      fleetAuthz,
      isEndpointRbacEnabled,
      hasEndpointManagementAccess,
      'readEndpointList'
    );
  const canWritePolicyManagement = hasKibanaPrivilege(
    fleetAuthz,
    isEndpointRbacEnabled,
    hasEndpointManagementAccess,
    'writePolicyManagement'
  );
  const canReadPolicyManagement =
    canWritePolicyManagement ||
    hasKibanaPrivilege(
      fleetAuthz,
      isEndpointRbacEnabled,
      hasEndpointManagementAccess,
      'readPolicyManagement'
    );
  const canWriteActionsLogManagement = hasKibanaPrivilege(
    fleetAuthz,
    isEndpointRbacEnabled,
    hasEndpointManagementAccess,
    'writeActionsLogManagement'
  );
  const canReadActionsLogManagement =
    canWriteActionsLogManagement ||
    hasKibanaPrivilege(
      fleetAuthz,
      isEndpointRbacEnabled,
      hasEndpointManagementAccess,
      'readActionsLogManagement'
    );
  const canIsolateHost = hasKibanaPrivilege(
    fleetAuthz,
    isEndpointRbacEnabled,
    hasEndpointManagementAccess,
    'writeHostIsolation'
  );
  const canWriteProcessOperations = hasKibanaPrivilege(
    fleetAuthz,
    isEndpointRbacEnabled,
    hasEndpointManagementAccess,
    'writeProcessOperations'
  );
  const canWriteTrustedApplications = hasKibanaPrivilege(
    fleetAuthz,
    isEndpointRbacEnabled,
    hasEndpointManagementAccess,
    'writeTrustedApplications'
  );
  const canReadTrustedApplications =
    canWriteTrustedApplications ||
    hasKibanaPrivilege(
      fleetAuthz,
      isEndpointRbacEnabled,
      hasEndpointManagementAccess,
      'readTrustedApplications'
    );

  const hasWriteHostIsolationExceptionsPermission = hasKibanaPrivilege(
    fleetAuthz,
    isEndpointRbacEnabled,
    hasEndpointManagementAccess,
    'writeHostIsolationExceptions'
  );
  const canWriteHostIsolationExceptions =
    hasWriteHostIsolationExceptionsPermission && isPlatinumPlusLicense;

  const hasReadHostIsolationExceptionsPermission =
    hasWriteHostIsolationExceptionsPermission ||
    hasKibanaPrivilege(
      fleetAuthz,
      isEndpointRbacEnabled,
      hasEndpointManagementAccess,
      'readHostIsolationExceptions'
    );
  // Calculate the Host Isolation Exceptions Authz. Some of these authz properties could be
  // set to `true` in cases where license was downgraded, but entries still exist.
  const canReadHostIsolationExceptions =
    canWriteHostIsolationExceptions ||
    (hasReadHostIsolationExceptionsPermission &&
      // We still allow `read` if not Platinum license, but entries exists for HIE
      (isPlatinumPlusLicense || hasHostIsolationExceptionsItems));

  const canDeleteHostIsolationExceptions =
    canWriteHostIsolationExceptions ||
    // Should be able to delete if host isolation exceptions exists and license is not platinum+
    (hasWriteHostIsolationExceptionsPermission &&
      !isPlatinumPlusLicense &&
      hasHostIsolationExceptionsItems);

  const canWriteBlocklist = hasKibanaPrivilege(
    fleetAuthz,
    isEndpointRbacEnabled,
    hasEndpointManagementAccess,
    'writeBlocklist'
  );
  const canReadBlocklist =
    canWriteBlocklist ||
    hasKibanaPrivilege(
      fleetAuthz,
      isEndpointRbacEnabled,
      hasEndpointManagementAccess,
      'readBlocklist'
    );
  const canWriteEventFilters = hasKibanaPrivilege(
    fleetAuthz,
    isEndpointRbacEnabled,
    hasEndpointManagementAccess,
    'writeEventFilters'
  );
  const canReadEventFilters =
    canWriteEventFilters ||
    hasKibanaPrivilege(
      fleetAuthz,
      isEndpointRbacEnabled,
      hasEndpointManagementAccess,
      'readEventFilters'
    );
  const canWriteFileOperations = hasKibanaPrivilege(
    fleetAuthz,
    isEndpointRbacEnabled,
    hasEndpointManagementAccess,
    'writeFileOperations'
  );

  return {
    canWriteSecuritySolution,
    canReadSecuritySolution,
    canAccessFleet: fleetAuthz?.fleet.all ?? userRoles.includes('superuser'),
    canAccessEndpointManagement: hasEndpointManagementAccess,
    canCreateArtifactsByPolicy: isPlatinumPlusLicense,
    canWriteEndpointList,
    canReadEndpointList,
    canWritePolicyManagement,
    canReadPolicyManagement,
    canWriteActionsLogManagement,
    canReadActionsLogManagement: canReadActionsLogManagement && isEnterpriseLicense,
    canAccessEndpointActionsLogManagement: canReadActionsLogManagement && isPlatinumPlusLicense,
    // Response Actions
    canIsolateHost: canIsolateHost && isPlatinumPlusLicense,
    canUnIsolateHost: canIsolateHost,
    canKillProcess: canWriteProcessOperations && isEnterpriseLicense,
    canSuspendProcess: canWriteProcessOperations && isEnterpriseLicense,
    canGetRunningProcesses: canWriteProcessOperations && isEnterpriseLicense,
    canAccessResponseConsole:
      isEnterpriseLicense &&
      (canIsolateHost || canWriteProcessOperations || canWriteFileOperations),
    canWriteFileOperations: canWriteFileOperations && isEnterpriseLicense,
    // artifacts
    canWriteTrustedApplications,
    canReadTrustedApplications,
    canWriteHostIsolationExceptions,
    canReadHostIsolationExceptions,
    canDeleteHostIsolationExceptions,
    canWriteBlocklist,
    canReadBlocklist,
    canWriteEventFilters,
    canReadEventFilters,
  };
};

export const getEndpointAuthzInitialState = (): EndpointAuthz => {
  return {
    ...defaultEndpointPermissions(),
    canAccessFleet: false,
    canAccessEndpointActionsLogManagement: false,
    canAccessEndpointManagement: false,
    canCreateArtifactsByPolicy: false,
    canWriteEndpointList: false,
    canReadEndpointList: false,
    canWritePolicyManagement: false,
    canReadPolicyManagement: false,
    canWriteActionsLogManagement: false,
    canReadActionsLogManagement: false,
    canIsolateHost: false,
    canUnIsolateHost: true,
    canKillProcess: false,
    canSuspendProcess: false,
    canGetRunningProcesses: false,
    canAccessResponseConsole: false,
    canWriteFileOperations: false,
    canWriteTrustedApplications: false,
    canReadTrustedApplications: false,
    canWriteHostIsolationExceptions: false,
    canReadHostIsolationExceptions: false,
    canDeleteHostIsolationExceptions: false,
    canWriteBlocklist: false,
    canReadBlocklist: false,
    canWriteEventFilters: false,
    canReadEventFilters: false,
  };
};

const SIEM_PERMISSIONS = [
  { permission: 'canWriteSecuritySolution', privilege: 'crud' },
  { permission: 'canReadSecuritySolution', privilege: 'show' },
] as const;

function hasPrivilege(
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

export function calculatePermissionsFromPrivileges(
  kibanaPrivileges:
    | Array<{
        resource?: string;
        privilege: string;
        authorized: boolean;
      }>
    | undefined
): EndpointPermissions {
  if (!kibanaPrivileges || !kibanaPrivileges.length) {
    return defaultEndpointPermissions();
  }

  const siemPermissions: EndpointPermissions = SIEM_PERMISSIONS.reduce(
    (acc, { permission, privilege }) => {
      return {
        ...acc,
        [permission]: hasPrivilege(kibanaPrivileges, 'siem/', privilege),
      };
    },
    {} as EndpointPermissions
  );

  return {
    ...siemPermissions,
  };
}

export function calculatePermissionsFromCapabilities(
  capabilities: Capabilities | undefined
): EndpointPermissions {
  if (!capabilities || !capabilities.siem) {
    return defaultEndpointPermissions();
  }

  return SIEM_PERMISSIONS.reduce((acc, { permission, privilege }) => {
    return {
      ...acc,
      [permission]: capabilities.siem[privilege] || false,
    };
  }, {} as EndpointPermissions);
}
