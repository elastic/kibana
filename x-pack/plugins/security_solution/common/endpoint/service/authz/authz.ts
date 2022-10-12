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

function hasPermission(
  fleetAuthz: FleetAuthz,
  isEndpointRbacEnabled: boolean,
  hasEndpointManagementAccess: boolean,
  privilege: typeof ENDPOINT_PRIVILEGES[number]
): boolean {
  return isEndpointRbacEnabled
    ? fleetAuthz.packagePrivileges?.endpoint?.actions[privilege].executePackageAction ?? false
    : hasEndpointManagementAccess;
}

/**
 * Used by both the server and the UI to generate the Authorization for access to Endpoint related
 * functionality
 *
 * @param licenseService
 * @param fleetAuthz
 * @param userRoles
 */
export const calculateEndpointAuthz = (
  licenseService: LicenseService,
  fleetAuthz: FleetAuthz,
  userRoles: MaybeImmutable<string[]>,
  isEndpointRbacEnabled: boolean = false,
  permissions: Partial<EndpointPermissions> = defaultEndpointPermissions()
): EndpointAuthz => {
  const isPlatinumPlusLicense = licenseService.isPlatinumPlus();
  const isEnterpriseLicense = licenseService.isEnterprise();
  const hasEndpointManagementAccess = userRoles.includes('superuser');
  const { canWriteSecuritySolution = false, canReadSecuritySolution = false } = permissions;
  const canWriteEndpointList = hasPermission(
    fleetAuthz,
    isEndpointRbacEnabled,
    hasEndpointManagementAccess,
    'writeEndpointList'
  );
  const canReadEndpointList =
    canWriteEndpointList ||
    hasPermission(
      fleetAuthz,
      isEndpointRbacEnabled,
      hasEndpointManagementAccess,
      'readEndpointList'
    );
  const canWritePolicyManagement = hasPermission(
    fleetAuthz,
    isEndpointRbacEnabled,
    hasEndpointManagementAccess,
    'writePolicyManagement'
  );
  const canReadPolicyManagement =
    canWritePolicyManagement ||
    hasPermission(
      fleetAuthz,
      isEndpointRbacEnabled,
      hasEndpointManagementAccess,
      'readPolicyManagement'
    );
  const canWriteActionsLogManagement = hasPermission(
    fleetAuthz,
    isEndpointRbacEnabled,
    hasEndpointManagementAccess,
    'writeActionsLogManagement'
  );
  const canReadActionsLogManagement =
    canWriteActionsLogManagement ||
    hasPermission(
      fleetAuthz,
      isEndpointRbacEnabled,
      hasEndpointManagementAccess,
      'readActionsLogManagement'
    );
  const canIsolateHost = hasPermission(
    fleetAuthz,
    isEndpointRbacEnabled,
    hasEndpointManagementAccess,
    'writeHostIsolation'
  );
  const canWriteProcessOperations = hasPermission(
    fleetAuthz,
    isEndpointRbacEnabled,
    hasEndpointManagementAccess,
    'writeProcessOperations'
  );
  const canWriteTrustedApplications = hasPermission(
    fleetAuthz,
    isEndpointRbacEnabled,
    hasEndpointManagementAccess,
    'writeTrustedApplications'
  );
  const canReadTrustedApplications =
    canWriteTrustedApplications ||
    hasPermission(
      fleetAuthz,
      isEndpointRbacEnabled,
      hasEndpointManagementAccess,
      'readTrustedApplications'
    );
  const canWriteHostIsolationExceptions = hasPermission(
    fleetAuthz,
    isEndpointRbacEnabled,
    hasEndpointManagementAccess,
    'writeHostIsolationExceptions'
  );
  const canReadHostIsolationExceptions =
    canWriteHostIsolationExceptions ||
    hasPermission(
      fleetAuthz,
      isEndpointRbacEnabled,
      hasEndpointManagementAccess,
      'readHostIsolationExceptions'
    );
  const canWriteBlocklist = hasPermission(
    fleetAuthz,
    isEndpointRbacEnabled,
    hasEndpointManagementAccess,
    'writeBlocklist'
  );
  const canReadBlocklist =
    canWriteBlocklist ||
    hasPermission(fleetAuthz, isEndpointRbacEnabled, hasEndpointManagementAccess, 'readBlocklist');
  const canWriteEventFilters = hasPermission(
    fleetAuthz,
    isEndpointRbacEnabled,
    hasEndpointManagementAccess,
    'writeEventFilters'
  );
  const canReadEventFilters =
    canWriteEventFilters ||
    hasPermission(
      fleetAuthz,
      isEndpointRbacEnabled,
      hasEndpointManagementAccess,
      'readEventFilters'
    );
  const canWriteFileOperations = hasPermission(
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
    canCreateArtifactsByPolicy: hasEndpointManagementAccess && isPlatinumPlusLicense,
    canWriteEndpointList,
    canReadEndpointList,
    canWritePolicyManagement,
    canReadPolicyManagement,
    canWriteActionsLogManagement,
    canReadActionsLogManagement: canReadActionsLogManagement && isEnterpriseLicense,
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
    canWriteHostIsolationExceptions: canWriteHostIsolationExceptions && isPlatinumPlusLicense,
    canReadHostIsolationExceptions,
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
