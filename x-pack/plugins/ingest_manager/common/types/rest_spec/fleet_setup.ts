/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface GetFleetSetupRequestSchema {}

export interface CreateFleetSetupRequestSchema {
  body: {
    admin_username: string;
    admin_password: string;
  };
}

export interface CreateFleetSetupResponse {
  isInitialized: boolean;
}
