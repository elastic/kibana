/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AssetReference,
  CategorySummaryList,
  PackageList,
  PackageInfo,
  PackageUsageStats,
  InstallType,
} from '../models/epm';

export interface GetCategoriesRequest {
  query: {
    experimental?: boolean;
    include_policy_templates?: boolean;
  };
}

export interface GetCategoriesResponse {
  response: CategorySummaryList;
}

export interface GetPackagesRequest {
  query: {
    category?: string;
    experimental?: boolean;
  };
}

export interface GetPackagesResponse {
  response: PackageList;
}

export interface GetLimitedPackagesResponse {
  response: string[];
}

export interface GetFileRequest {
  params: {
    pkgkey: string;
    filePath: string;
  };
}

export interface GetInfoRequest {
  params: {
    pkgkey: string;
  };
}

export interface GetInfoResponse {
  response: PackageInfo;
}

export interface GetStatsRequest {
  params: {
    pkgname: string;
  };
}

export interface GetStatsResponse {
  response: PackageUsageStats;
}

export interface InstallPackageRequest {
  params: {
    pkgkey: string;
  };
}

export interface InstallPackageResponse {
  response: AssetReference[];
}

export interface IBulkInstallPackageHTTPError {
  name: string;
  statusCode: number;
  error: string | Error;
}

export interface InstallResult {
  assets?: AssetReference[];
  status?: 'installed' | 'already_installed';
  error?: Error;
  installType: InstallType;
}

export interface BulkInstallPackageInfo {
  name: string;
  version: string;
  result: InstallResult;
}

export interface BulkInstallPackagesResponse {
  response: Array<BulkInstallPackageInfo | IBulkInstallPackageHTTPError>;
}

export interface BulkInstallPackagesRequest {
  body: {
    packages: string[];
  };
}

export interface MessageResponse {
  response: string;
}

export interface DeletePackageRequest {
  params: {
    pkgkey: string;
  };
}

export interface DeletePackageResponse {
  response: AssetReference[];
}
