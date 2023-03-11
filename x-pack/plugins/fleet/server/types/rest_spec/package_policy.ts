/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import {
  CreatePackagePolicyRequestBodySchema,
  SimplifiedCreatePackagePolicyRequestBodySchema,
  UpdatePackagePolicyRequestBodySchema,
} from '../models';

import { ListWithKuerySchema, BulkRequestBodySchema } from './common';

export const GetPackagePoliciesRequestSchema = {
  query: ListWithKuerySchema.extends({
    withAgentCount: schema.maybe(schema.boolean()),
  }),
};

export const BulkGetPackagePoliciesRequestSchema = {
  body: BulkRequestBodySchema,
};

export const GetOnePackagePolicyRequestSchema = {
  params: schema.object({
    packagePolicyId: schema.string(),
  }),
};

export const CreatePackagePolicyRequestSchema = {
  body: schema.oneOf([
    CreatePackagePolicyRequestBodySchema,
    SimplifiedCreatePackagePolicyRequestBodySchema,
  ]),
};

export const UpdatePackagePolicyRequestSchema = {
  ...GetOnePackagePolicyRequestSchema,
  body: schema.oneOf([
    UpdatePackagePolicyRequestBodySchema,
    SimplifiedCreatePackagePolicyRequestBodySchema,
  ]),
};

export const DeletePackagePoliciesRequestSchema = {
  body: schema.object({
    packagePolicyIds: schema.arrayOf(schema.string()),
    force: schema.maybe(schema.boolean()),
  }),
};

export const DeleteOnePackagePolicyRequestSchema = {
  params: schema.object({
    packagePolicyId: schema.string(),
  }),
  query: schema.object({
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
