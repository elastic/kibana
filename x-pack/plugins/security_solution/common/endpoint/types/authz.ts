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
  /** If user has permissions to access Fleet */
  canAccessFleet: boolean;
  /** If user has permissions to access Endpoint management (includes check to ensure they also have access to fleet) */
  canAccessEndpointManagement: boolean;
  /** if user has permissions to create Artifacts by Policy */
  canCreateArtifactsByPolicy: boolean;
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
}

export type EndpointAuthzKeyList = Array<keyof EndpointAuthz>;

export interface EndpointPrivileges extends EndpointAuthz {
  loading: boolean;
}
