/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import {
  CreatePackagePolicyRequestBodySchema,
  UpdatePackagePolicyRequestBodySchema,
} from '../models';

import { ListWithKuerySchema } from '.';

export const GetPackagePoliciesRequestSchema = {
  query: ListWithKuerySchema,
};

export const GetOnePackagePolicyRequestSchema = {
  params: schema.object({
    packagePolicyId: schema.string(),
  }),
};

export const CreatePackagePolicyRequestSchema = {
  body: CreatePackagePolicyRequestBodySchema,
};

export const UpdatePackagePolicyRequestSchema = {
  ...GetOnePackagePolicyRequestSchema,
  body: UpdatePackagePolicyRequestBodySchema,
};

export const DeletePackagePoliciesRequestSchema = {
  body: schema.object({
    packagePolicyIds: schema.arrayOf(schema.string()),
    force: schema.maybe(schema.boolean()),
  }),
};

export const UpgradePackagePoliciesRequestSchema = {
  body: schema.object({
    packagePolicyIds: schema.arrayOf(schema.string()),
  }),
};

export const DryRunPackagePoliciesRequestSchema = {
  body: schema.object({
    packagePolicyIds: schema.arrayOf(schema.string()),
    packageVersion: schema.maybe(schema.string()),
  }),
};
