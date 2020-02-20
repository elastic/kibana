/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { EnrollmentAPIKey } from '../../../common';

export const GetEnrollmentAPIKeysRequestSchema = {
  query: schema.object({
    page: schema.number({ defaultValue: 1 }),
    perPage: schema.number({ defaultValue: 20 }),
    kuery: schema.maybe(schema.string()),
  }),
};

export interface GetEnrollmentAPIKeysResponse {
  list: EnrollmentAPIKey[];
  total: number;
  page: number;
  perPage: number;
  success: boolean;
}

export const GetOneEnrollmentAPIKeyRequestSchema = {
  params: schema.object({
    keyId: schema.string(),
  }),
};

export interface GetOneEnrollmentAPIKeyResponse {
  item: EnrollmentAPIKey;
  success: boolean;
}

export const DeleteEnrollmentAPIKeyRequestSchema = {
  params: schema.object({
    keyId: schema.string(),
  }),
};

export interface DeleteEnrollmentAPIKeyResponse {
  action: string;
  success: boolean;
}

export const PostEnrollmentAPIKeyRequestSchema = {
  body: schema.object({
    name: schema.maybe(schema.string()),
    policy_id: schema.string(),
    expiration: schema.maybe(schema.string()),
  }),
};

export interface PostEnrollmentAPIKeyResponse {
  action: string;
  item: EnrollmentAPIKey;
  success: boolean;
}
