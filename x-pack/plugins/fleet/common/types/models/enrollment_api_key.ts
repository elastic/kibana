/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface EnrollmentAPIKey {
  id: string;
  api_key_id: string;
  api_key: string;
  name?: string;
  active: boolean;
  policy_id?: string;
  created_at: string;
}

export type EnrollmentAPIKeySOAttributes = Omit<EnrollmentAPIKey, 'id'>;
