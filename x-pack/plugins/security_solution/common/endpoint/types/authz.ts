/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Set of Endpoint Specific privileges that control application authorization. This interface is
 * used both on the client and server for consistency
 */
export interface EndpointAuthz {
  /** if user has write permissions to the security solution app */
  canWriteSecuritySolution: boolean;
  /** if user has read permissions to the security solution app */
  canReadSecuritySolution: boolean;
  /** If user has permissions to access Fleet */
  canAccessFleet: boolean;
  /** If user has permissions to access Endpoint management (includes check to ensure they also have access to fleet) */
  canAccessEndpointManagement: boolean;
  /** If user has permissions to access Actions Log management and also has a platinum license (used for endpoint details flyout) */
  canAccessEndpointActionsLogManagement: boolean;
  /** if user has permissions to create Artifacts by Policy */
  canCreateArtifactsByPolicy: boolean;
  /** if user has write permissions to endpoint list */
  canWriteEndpointList: boolean;
  /** if user has read permissions to endpoint list */
  canReadEndpointList: boolean;
  /** if user has write permissions for policy management */
  canWritePolicyManagement: boolean;
  /** if user has read permissions for policy management */
  canReadPolicyManagement: boolean;
  /** if user has write permissions for actions log management */
  canWriteActionsLogManagement: boolean;
  /** if user has read permissions for actions log management */
  canReadActionsLogManagement: boolean;
  /** If user has permissions to isolate hosts */
  canIsolateHost: boolean;
  /** If user has permissions to un-isolate (release) hosts */
  canUnIsolateHost: boolean;
  /** If user has permissions to kill process on hosts */
  canKillProcess: boolean;
  /** If user has permissions to suspend process on hosts */
  canSuspendProcess: boolean;
  /** If user has permissions to get running processes on hosts */
  canGetRunningProcesses: boolean;
  /** If user has permissions to use the Response Actions Console */
  canAccessResponseConsole: boolean;
  /** If user has write permissions to use execute action */
  canExecuteCommand: boolean;
  /** If user has write permissions to use file operations */
  canWriteFileOperations: boolean;
  /** if user has write permissions for trusted applications */
  canWriteTrustedApplications: boolean;
  /** if user has read permissions for trusted applications */
  canReadTrustedApplications: boolean;
  /** if user has write permissions for host isolation exceptions */
  canWriteHostIsolationExceptions: boolean;
  /** if user has read permissions for host isolation exceptions */
  canReadHostIsolationExceptions: boolean;
  /**
   * if user has permissions to delete host isolation exceptions. This could be set to true, while
   * `canWriteHostIsolationExceptions` is false in cases where the license might have been downgraded.
   * In that use case, users should still be allowed to ONLY delete entries.
   */
  canDeleteHostIsolationExceptions: boolean;
  /** if user has write permissions for blocklist entries */
  canWriteBlocklist: boolean;
  /** if user has read permissions for blocklist entries */
  canReadBlocklist: boolean;
  /** if user has write permissions for event filters */
  canWriteEventFilters: boolean;
  /** if user has read permissions for event filters */
  canReadEventFilters: boolean;
}

export type EndpointAuthzKeyList = Array<keyof EndpointAuthz>;

export interface EndpointPrivileges extends EndpointAuthz {
  loading: boolean;
}
