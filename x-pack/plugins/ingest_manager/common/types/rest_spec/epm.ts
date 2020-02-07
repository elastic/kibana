/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';
import {
  AssetReference,
  CategorySummaryList,
  Installable,
  RegistryPackage,
  Installed,
  NotInstalled,
} from '../epm';

export interface GetCategoriesResponse {
  response: CategorySummaryList;
  success: boolean;
}
export const GetPackagesRequestSchema = {
  query: schema.object({
    category: schema.maybe(schema.string()),
  }),
};

export interface GetPackagesResponse {
  response: Array<
    Installable<
      Pick<
        RegistryPackage,
        | 'name'
        | 'title'
        | 'version'
        | 'description'
        | 'type'
        | 'icons'
        | 'internal'
        | 'download'
        | 'path'
      >
    >
  >;
  success: boolean;
}

export const GetFileRequestSchema = {
  params: schema.object({
    pkgkey: schema.string(),
    filePath: schema.string(),
  }),
};

export const GetInfoRequestSchema = {
  params: schema.object({
    pkgkey: schema.string(),
  }),
};

export interface GetInfoResponse {
  response: Installed | NotInstalled;
  success: boolean;
}

export const InstallPackageRequestSchema = {
  params: schema.object({
    pkgkey: schema.string(),
  }),
};

export interface InstallPackageResponse {
  response: AssetReference[];
  success: boolean;
}

export const DeletePackageRequestSchema = {
  params: schema.object({
    pkgkey: schema.string(),
  }),
};

export interface DeletePackageResponse {
  response: AssetReference[];
  success: boolean;
}
