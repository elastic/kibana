/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Set of Endpoint Specific privileges that control application authrorization. This interface is
 * used both on the client and server for consistency
 */
export interface EndpointPrivileges {
  loading: boolean;
  /** If user has permissions to access Fleet */
  canAccessFleet: boolean;
  /** If user has permissions to access Endpoint management (includes check to ensure they also have access to fleet) */
  canAccessEndpointManagement: boolean;
  /** if user has permissions to create Artifacts by Policy */
  canCreateArtifactsByPolicy: boolean;
  /** If user has permissions to use the Host isolation feature */
  canIsolateHost: boolean;
}
