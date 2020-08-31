/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EnrollmentAPIKey } from '../models';

export interface GetEnrollmentAPIKeysRequest {
  query: {
    page: number;
    perPage: number;
    kuery?: string;
  };
}

export interface GetEnrollmentAPIKeysResponse {
  list: EnrollmentAPIKey[];
  total: number;
  page: number;
  perPage: number;
  success: boolean;
}

export interface GetOneEnrollmentAPIKeyRequest {
  params: {
    keyId: string;
  };
}

export interface GetOneEnrollmentAPIKeyResponse {
  item: EnrollmentAPIKey;
  success: boolean;
}

export interface DeleteEnrollmentAPIKeyRequest {
  params: {
    keyId: string;
  };
}

export interface DeleteEnrollmentAPIKeyResponse {
  action: string;
  success: boolean;
}

export interface PostEnrollmentAPIKeyRequest {
  body: {
    name?: string;
    policy_id: string;
    expiration?: string;
  };
}

export interface PostEnrollmentAPIKeyResponse {
  action: string;
  item: EnrollmentAPIKey;
  success: boolean;
}
