/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';

export const GetFleetSetupRequestSchema = {};

export const CreateFleetSetupRequestSchema = {
  body: schema.object({
    admin_username: schema.string(),
    admin_password: schema.string(),
  }),
};

export interface CreateFleetSetupResponse {
  isInitialized: boolean;
}
