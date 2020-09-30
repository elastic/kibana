/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';

export const GetCategoriesRequestSchema = {
  query: schema.object({
    experimental: schema.maybe(schema.boolean()),
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
    pkgkey: schema.string(),
  }),
};

export const InstallPackageFromRegistryRequestSchema = {
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
    pkgkey: schema.string(),
  }),
};
