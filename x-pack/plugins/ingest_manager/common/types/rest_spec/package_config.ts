/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PackageConfig, NewPackageConfig, UpdatePackageConfig } from '../models';

export interface GetPackageConfigsRequest {
  query: {
    page: number;
    perPage: number;
    kuery?: string;
  };
}

export interface GetPackageConfigsResponse {
  items: PackageConfig[];
  total: number;
  page: number;
  perPage: number;
  success: boolean;
}

export interface GetOnePackageConfigRequest {
  params: {
    packageConfigId: string;
  };
}

export interface GetOnePackageConfigResponse {
  item: PackageConfig;
  success: boolean;
}

export interface CreatePackageConfigRequest {
  body: NewPackageConfig;
}

export interface CreatePackageConfigResponse {
  item: PackageConfig;
  success: boolean;
}

export type UpdatePackageConfigRequest = GetOnePackageConfigRequest & {
  body: UpdatePackageConfig;
};

export type UpdatePackageConfigResponse = CreatePackageConfigResponse;

export interface DeletePackageConfigsRequest {
  body: {
    packageConfigIds: string[];
  };
}

export type DeletePackageConfigsResponse = Array<{
  id: string;
  success: boolean;
}>;
