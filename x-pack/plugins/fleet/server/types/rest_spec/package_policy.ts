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

import { ListWithKuerySchema, BulkRequestBodySchema } from './common';

export const GetPackagePoliciesRequestSchema = {
  query: ListWithKuerySchema,
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
  body: CreatePackagePolicyRequestBodySchema,
};

const SimplifiedVarsSchema = schema.recordOf(
  schema.string(),
  schema.oneOf([
    schema.boolean(),
    schema.string(),
    schema.number(),
    schema.arrayOf(schema.string()),
    schema.arrayOf(schema.number()),
  ])
);

export const CreateSimplifiedPackagePolicyRequestSchema = {
  body: schema.object({
    id: schema.maybe(schema.string()),
    name: schema.string(),
    policy_id: schema.string(),
    namespace: schema.string({ defaultValue: 'default' }),
    package: schema.object({
      name: schema.string(),
      version: schema.string(),
    }),
    force: schema.maybe(schema.boolean()),
    vars: SimplifiedVarsSchema,
    inputs: schema.recordOf(
      schema.string(),
      schema.object({
        enabled: schema.maybe(schema.boolean()),
        vars: SimplifiedVarsSchema,
        streams: schema.recordOf(
          schema.string(),
          schema.object({
            enabled: schema.maybe(schema.boolean()),
            vars: SimplifiedVarsSchema,
          })
        ),
      })
    ),
  }),
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
