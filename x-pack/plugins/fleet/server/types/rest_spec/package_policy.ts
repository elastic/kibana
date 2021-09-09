/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { NewPackagePolicySchema, UpdatePackagePolicySchema } from '../models';

import { ListWithKuerySchema } from './index';

export const GetPackagePoliciesRequestSchema = {
  query: ListWithKuerySchema,
};

export const GetOnePackagePolicyRequestSchema = {
  params: schema.object({
    packagePolicyId: schema.string(),
  }),
};

export const CreatePackagePolicyRequestSchema = {
  body: NewPackagePolicySchema,
};

export const UpdatePackagePolicyRequestSchema = {
  ...GetOnePackagePolicyRequestSchema,
  body: UpdatePackagePolicySchema,
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
    dryRun: schema.maybe(schema.boolean()),
    packageVersion: schema.maybe(schema.string()),
  }),
};
