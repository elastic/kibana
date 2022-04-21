/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const GetCategoriesRequestSchema = {
  query: schema.object({
    experimental: schema.maybe(schema.boolean()),
    include_policy_templates: schema.maybe(schema.boolean()),
  }),
};

export const GetPackagesRequestSchema = {
  query: schema.object({
    category: schema.maybe(schema.string()),
    experimental: schema.maybe(schema.boolean()),
  }),
};

export const GetFileRequestSchema = {
  params: schema.object({
    pkgName: schema.string(),
    pkgVersion: schema.string(),
    filePath: schema.string(),
  }),
};

export const GetInfoRequestSchema = {
  params: schema.object({
    pkgName: schema.string(),
    pkgVersion: schema.maybe(schema.string()),
  }),
};

export const GetInfoRequestSchemaDeprecated = {
  params: schema.object({
    pkgkey: schema.string(),
  }),
};

export const UpdatePackageRequestSchema = {
  params: schema.object({
    pkgName: schema.string(),
    pkgVersion: schema.maybe(schema.string()),
  }),
  body: schema.object({
    keepPoliciesUpToDate: schema.boolean(),
  }),
};

export const UpdatePackageRequestSchemaDeprecated = {
  params: schema.object({
    pkgkey: schema.string(),
  }),
  body: schema.object({
    keepPoliciesUpToDate: schema.boolean(),
  }),
};

export const GetStatsRequestSchema = {
  params: schema.object({
    pkgName: schema.string(),
  }),
};

export const InstallPackageFromRegistryRequestSchema = {
  params: schema.object({
    pkgName: schema.string(),
    pkgVersion: schema.maybe(schema.string()),
  }),
  body: schema.nullable(
    schema.object({
      force: schema.boolean({ defaultValue: false }),
      ignore_constraints: schema.boolean({ defaultValue: false }),
    })
  ),
};

export const InstallPackageFromRegistryRequestSchemaDeprecated = {
  params: schema.object({
    pkgkey: schema.string(),
  }),
  body: schema.nullable(
    schema.object({
      force: schema.boolean(),
    })
  ),
};

export const BulkUpgradePackagesFromRegistryRequestSchema = {
  body: schema.object({
    packages: schema.arrayOf(schema.string(), { minSize: 1 }),
  }),
};

export const InstallPackageByUploadRequestSchema = {
  body: schema.buffer(),
};

export const DeletePackageRequestSchema = {
  params: schema.object({
    pkgName: schema.string(),
    pkgVersion: schema.string(),
  }),
  body: schema.nullable(
    schema.object({
      force: schema.boolean(),
    })
  ),
};

export const DeletePackageRequestSchemaDeprecated = {
  params: schema.object({
    pkgkey: schema.string(),
  }),
  body: schema.nullable(
    schema.object({
      force: schema.boolean(),
    })
  ),
};
