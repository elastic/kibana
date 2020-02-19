/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  AssetReference,
  CategorySummaryList,
  Installable,
  RegistryPackage,
  PackageInfo,
} from '../models/epm';

export interface GetCategoriesResponse {
  response: CategorySummaryList;
  success: boolean;
}
export interface GetPackagesRequestSchema {
  query: {
    category?: string;
  };
}

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

export interface GetFileRequestSchema {
  params: {
    pkgkey: string;
    filePath: string;
  };
}

export interface GetInfoRequestSchema {
  params: {
    pkgkey: string;
  };
}

export interface GetInfoResponse {
  response: PackageInfo;
  success: boolean;
}

export interface InstallPackageRequestSchema {
  params: {
    pkgkey: string;
  };
}

export interface InstallPackageResponse {
  response: AssetReference[];
  success: boolean;
}

export interface DeletePackageRequestSchema {
  params: {
    pkgkey: string;
  };
}

export interface DeletePackageResponse {
  response: AssetReference[];
  success: boolean;
}
