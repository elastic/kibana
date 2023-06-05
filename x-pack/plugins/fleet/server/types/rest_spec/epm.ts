/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const GetCategoriesRequestSchema = {
  query: schema.object({
    prerelease: schema.maybe(schema.boolean()),
    experimental: schema.maybe(schema.boolean()), // deprecated
    include_policy_templates: schema.maybe(schema.boolean()),
  }),
};

export const GetPackagesRequestSchema = {
  query: schema.object({
    category: schema.maybe(schema.string()),
    prerelease: schema.maybe(schema.boolean()),
    experimental: schema.maybe(schema.boolean()), // deprecated
    excludeInstallStatus: schema.maybe(schema.boolean({ defaultValue: false })),
  }),
};

export const GetInstalledPackagesRequestSchema = {
  query: schema.object({
    dataStreamType: schema.maybe(
      schema.oneOf([
        schema.literal('logs'),
        schema.literal('metrics'),
        schema.literal('traces'),
        schema.literal('synthetics'),
        schema.literal('profiling'),
      ])
    ),
    nameQuery: schema.maybe(schema.string()),
    searchAfter: schema.maybe(schema.arrayOf(schema.oneOf([schema.string(), schema.number()]))),
    perPage: schema.number({ defaultValue: 30 }),
    sortOrder: schema.oneOf([schema.literal('asc'), schema.literal('desc')], {
      defaultValue: 'asc',
    }),
  }),
};

export const GetDataStreamsRequestSchema = {
  query: schema.object({
    type: schema.maybe(
      schema.oneOf([
        schema.literal('logs'),
        schema.literal('metrics'),
        schema.literal('traces'),
        schema.literal('synthetics'),
        schema.literal('profiling'),
      ])
    ),
    datasetQuery: schema.maybe(schema.string()),
    sortOrder: schema.oneOf([schema.literal('asc'), schema.literal('desc')], {
      defaultValue: 'asc',
    }),
    uncategorisedOnly: schema.boolean({ defaultValue: false }),
  }),
};

export const GetLimitedPackagesRequestSchema = {
  query: schema.object({
    prerelease: schema.maybe(schema.boolean()),
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
  query: schema.object({
    ignoreUnverified: schema.maybe(schema.boolean()),
    prerelease: schema.maybe(schema.boolean()),
    full: schema.maybe(schema.boolean()),
  }),
};

export const GetInfoRequestSchemaDeprecated = {
  params: schema.object({
    pkgkey: schema.string(),
  }),
  query: schema.object({
    ignoreUnverified: schema.maybe(schema.boolean()),
    prerelease: schema.maybe(schema.boolean()),
    full: schema.maybe(schema.boolean()),
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
  query: schema.object({
    prerelease: schema.maybe(schema.boolean()),
  }),
  body: schema.nullable(
    schema.object({
      force: schema.boolean({ defaultValue: false }),
      ignore_constraints: schema.boolean({ defaultValue: false }),
    })
  ),
};

export const ReauthorizeTransformRequestSchema = {
  params: schema.object({
    pkgName: schema.string(),
    pkgVersion: schema.maybe(schema.string()),
  }),
  query: schema.object({
    prerelease: schema.maybe(schema.boolean()),
  }),
  body: schema.object({
    transforms: schema.arrayOf(schema.object({ transformId: schema.string() })),
  }),
};

export const InstallPackageFromRegistryRequestSchemaDeprecated = {
  params: schema.object({
    pkgkey: schema.string(),
  }),
  query: schema.object({
    prerelease: schema.maybe(schema.boolean()),
  }),
  body: schema.nullable(
    schema.object({
      force: schema.boolean(),
    })
  ),
};

export const BulkInstallPackagesFromRegistryRequestSchema = {
  query: schema.object({
    prerelease: schema.maybe(schema.boolean()),
  }),
  body: schema.object({
    packages: schema.arrayOf(
      schema.oneOf([
        schema.string(),
        schema.object({ name: schema.string(), version: schema.string() }),
      ]),
      { minSize: 1 }
    ),
    force: schema.boolean({ defaultValue: false }),
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
