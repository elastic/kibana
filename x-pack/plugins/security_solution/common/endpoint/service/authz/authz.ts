/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ENDPOINT_PRIVILEGES, FleetAuthz } from '@kbn/fleet-plugin/common';

import type { LicenseService } from '../../../license';
import type { EndpointAuthz } from '../../types/authz';
import type { MaybeImmutable } from '../../types';

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
  privilege: keyof typeof ENDPOINT_PRIVILEGES
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
  hasHostIsolationExceptionsItems: boolean = false
): EndpointAuthz => {
  const isPlatinumPlusLicense = licenseService.isPlatinumPlus();
  const isEnterpriseLicense = licenseService.isEnterprise();
  const hasEndpointManagementAccess = userRoles.includes('superuser');

  const canWriteSecuritySolution = hasKibanaPrivilege(
    fleetAuthz,
    true,
    hasEndpointManagementAccess,
    'writeSecuritySolution'
  );
  const canReadSecuritySolution =
    canWriteSecuritySolution ||
    hasKibanaPrivilege(fleetAuthz, true, hasEndpointManagementAccess, 'readSecuritySolution');
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

  const canWriteExecuteOperations = hasKibanaPrivilege(
    fleetAuthz,
    isEndpointRbacEnabled,
    hasEndpointManagementAccess,
    'writeExecuteOperations'
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
    canWriteExecuteOperations: canWriteExecuteOperations && isEnterpriseLicense,
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
    canWriteSecuritySolution: false,
    canReadSecuritySolution: false,
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
    canWriteExecuteOperations: false,
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
