/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';

export const GetPackagesRequestSchema = {
  query: schema.object({
    category: schema.maybe(schema.string()),
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

export const InstallPackageRequestSchema = {
  params: schema.object({
    pkgkey: schema.string(),
  }),
};

export const DeletePackageRequestSchema = {
  params: schema.object({
    pkgkey: schema.string(),
  }),
};
