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
  InstallSource,
} from '../models/epm';

export interface GetCategoriesRequest {
  query: {
    experimental?: boolean;
    include_policy_templates?: boolean;
  };
}

export interface GetCategoriesResponse {
  items: CategorySummaryList;
  // deprecated in 8.0
  response?: CategorySummaryList;
}

export interface GetPackagesRequest {
  query: {
    category?: string;
    experimental?: boolean;
  };
}

export interface GetPackagesResponse {
  items: PackageList;
  // deprecated in 8.0
  response?: PackageList;
}

export interface GetLimitedPackagesResponse {
  items: string[];
  // deprecated in 8.0
  response?: string[];
}

export interface GetFileRequest {
  params: {
    pkgName: string;
    pkgVersion: string;
    filePath: string;
  };
}

export interface GetInfoRequest {
  params: {
    // deprecated in 8.0
    pkgkey?: string;
    pkgName: string;
    pkgVersion: string;
  };
}

export interface GetInfoResponse {
  item: PackageInfo;
  // deprecated in 8.0
  response?: PackageInfo;
}

export interface UpdatePackageRequest {
  params: {
    // deprecated in 8.0
    pkgkey?: string;
    pkgName: string;
    pkgVersion: string;
  };
  body: {
    keepPoliciesUpToDate?: boolean;
  };
}

export interface UpdatePackageResponse {
  item: PackageInfo;
  // deprecated in 8.0
  response?: PackageInfo;
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
    // deprecated in 8.0
    pkgkey?: string;
    pkgName: string;
    pkgVersion: string;
  };
}

export interface InstallPackageResponse {
  items: AssetReference[];
  _meta: {
    install_source: InstallSource;
  };
  // deprecated in 8.0
  response?: AssetReference[];
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
  installSource: InstallSource;
}

export interface BulkInstallPackageInfo {
  name: string;
  version: string;
  result: InstallResult;
}

export interface BulkInstallPackagesResponse {
  items: Array<BulkInstallPackageInfo | IBulkInstallPackageHTTPError>;
  // deprecated in 8.0
  response?: Array<BulkInstallPackageInfo | IBulkInstallPackageHTTPError>;
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
    // deprecated in 8.0
    pkgkey?: string;
    pkgName: string;
    pkgVersion: string;
  };
}

export interface DeletePackageResponse {
  // deprecated in 8.0
  response?: AssetReference[];
  items: AssetReference[];
}
