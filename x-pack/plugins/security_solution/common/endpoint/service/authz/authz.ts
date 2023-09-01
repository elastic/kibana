/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ENDPOINT_PRIVILEGES, FleetAuthz } from '@kbn/fleet-plugin/common';

import { omit } from 'lodash';
import { RESPONSE_CONSOLE_ACTION_COMMANDS_TO_REQUIRED_AUTHZ } from '../response_actions/constants';
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
 * @param privilege
 */
export function hasKibanaPrivilege(
  fleetAuthz: FleetAuthz,
  privilege: keyof typeof ENDPOINT_PRIVILEGES
): boolean {
  return fleetAuthz.packagePrivileges?.endpoint?.actions[privilege].executePackageAction ?? false;
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
  userRoles: MaybeImmutable<string[]> = []
): EndpointAuthz => {
  const isPlatinumPlusLicense = licenseService.isPlatinumPlus();
  const isEnterpriseLicense = licenseService.isEnterprise();
  const hasEndpointManagementAccess = userRoles.includes('superuser');

  const canWriteSecuritySolution = hasKibanaPrivilege(fleetAuthz, 'writeSecuritySolution');
  const canReadSecuritySolution = hasKibanaPrivilege(fleetAuthz, 'readSecuritySolution');
  const canWriteEndpointList = hasKibanaPrivilege(fleetAuthz, 'writeEndpointList');
  const canReadEndpointList = hasKibanaPrivilege(fleetAuthz, 'readEndpointList');
  const canWritePolicyManagement = hasKibanaPrivilege(fleetAuthz, 'writePolicyManagement');
  const canReadPolicyManagement = hasKibanaPrivilege(fleetAuthz, 'readPolicyManagement');
  const canWriteActionsLogManagement = hasKibanaPrivilege(fleetAuthz, 'writeActionsLogManagement');
  const canReadActionsLogManagement = hasKibanaPrivilege(fleetAuthz, 'readActionsLogManagement');
  const canIsolateHost = hasKibanaPrivilege(fleetAuthz, 'writeHostIsolation');
  const canUnIsolateHost = hasKibanaPrivilege(fleetAuthz, 'writeHostIsolationRelease');
  const canWriteProcessOperations = hasKibanaPrivilege(fleetAuthz, 'writeProcessOperations');
  const canWriteTrustedApplications = hasKibanaPrivilege(fleetAuthz, 'writeTrustedApplications');
  const canReadTrustedApplications = hasKibanaPrivilege(fleetAuthz, 'readTrustedApplications');
  const canWriteHostIsolationExceptions = hasKibanaPrivilege(
    fleetAuthz,
    'writeHostIsolationExceptions'
  );
  const canReadHostIsolationExceptions = hasKibanaPrivilege(
    fleetAuthz,
    'readHostIsolationExceptions'
  );
  const canAccessHostIsolationExceptions = hasKibanaPrivilege(
    fleetAuthz,
    'accessHostIsolationExceptions'
  );
  const canDeleteHostIsolationExceptions = hasKibanaPrivilege(
    fleetAuthz,
    'deleteHostIsolationExceptions'
  );
  const canWriteBlocklist = hasKibanaPrivilege(fleetAuthz, 'writeBlocklist');
  const canReadBlocklist = hasKibanaPrivilege(fleetAuthz, 'readBlocklist');
  const canWriteEventFilters = hasKibanaPrivilege(fleetAuthz, 'writeEventFilters');
  const canReadEventFilters = hasKibanaPrivilege(fleetAuthz, 'readEventFilters');
  const canWriteFileOperations = hasKibanaPrivilege(fleetAuthz, 'writeFileOperations');

  const canWriteExecuteOperations = hasKibanaPrivilege(fleetAuthz, 'writeExecuteOperations');

  const authz: EndpointAuthz = {
    canWriteSecuritySolution,
    canReadSecuritySolution,
    canAccessFleet: fleetAuthz?.fleet.all ?? false,
    canAccessEndpointManagement: hasEndpointManagementAccess, // TODO: is this one deprecated? it is the only place we need to check for superuser.
    canCreateArtifactsByPolicy: isPlatinumPlusLicense,
    canWriteEndpointList,
    canReadEndpointList,
    canWritePolicyManagement,
    canReadPolicyManagement,
    canWriteActionsLogManagement,
    canReadActionsLogManagement: canReadActionsLogManagement && isEnterpriseLicense,
    canAccessEndpointActionsLogManagement: canReadActionsLogManagement && isPlatinumPlusLicense,

    // ---------------------------------------------------------
    // Response Actions
    // ---------------------------------------------------------
    canIsolateHost: canIsolateHost && isPlatinumPlusLicense,
    canUnIsolateHost,
    canKillProcess: canWriteProcessOperations && isEnterpriseLicense,
    canSuspendProcess: canWriteProcessOperations && isEnterpriseLicense,
    canGetRunningProcesses: canWriteProcessOperations && isEnterpriseLicense,
    canAccessResponseConsole: false, // set further below
    canWriteExecuteOperations: canWriteExecuteOperations && isEnterpriseLicense,
    canWriteFileOperations: canWriteFileOperations && isEnterpriseLicense,

    // ---------------------------------------------------------
    // artifacts
    // ---------------------------------------------------------
    canWriteTrustedApplications,
    canReadTrustedApplications,
    canWriteHostIsolationExceptions: canWriteHostIsolationExceptions && isPlatinumPlusLicense,
    canAccessHostIsolationExceptions: canAccessHostIsolationExceptions && isPlatinumPlusLicense,
    canReadHostIsolationExceptions,
    canDeleteHostIsolationExceptions,
    canWriteBlocklist,
    canReadBlocklist,
    canWriteEventFilters,
    canReadEventFilters,
  };

  // Response console is only accessible when license is Enterprise and user has access to any
  // of the response actions except `release`. Sole access to `release` is something
  // that is supported for a user in a license downgrade scenario, and in that case, we don't want
  // to allow access to Response Console.
  authz.canAccessResponseConsole =
    isEnterpriseLicense &&
    Object.values(omit(RESPONSE_CONSOLE_ACTION_COMMANDS_TO_REQUIRED_AUTHZ, 'release')).some(
      (responseActionAuthzKey) => {
        return authz[responseActionAuthzKey];
      }
    );

  return authz;
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
    canUnIsolateHost: false,
    canKillProcess: false,
    canSuspendProcess: false,
    canGetRunningProcesses: false,
    canAccessResponseConsole: false,
    canWriteFileOperations: false,
    canWriteExecuteOperations: false,
    canWriteTrustedApplications: false,
    canReadTrustedApplications: false,
    canWriteHostIsolationExceptions: false,
    canAccessHostIsolationExceptions: false,
    canReadHostIsolationExceptions: false,
    canDeleteHostIsolationExceptions: false,
    canWriteBlocklist: false,
    canReadBlocklist: false,
    canWriteEventFilters: false,
    canReadEventFilters: false,
  };
};
