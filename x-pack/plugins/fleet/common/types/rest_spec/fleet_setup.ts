/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface CreateFleetSetupResponse {
  isInitialized: boolean;
}

export interface GetFleetStatusResponse {
  isReady: boolean;
  missing_requirements: Array<
    | 'tls_required'
    | 'api_keys'
    | 'fleet_admin_user'
    | 'encrypted_saved_object_encryption_key_required'
  >;
}
