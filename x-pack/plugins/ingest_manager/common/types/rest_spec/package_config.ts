/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PackagePolicy, NewPackagePolicy, UpdatePackagePolicy } from '../models';

export interface GetPackagePoliciesRequest {
  query: {
    page: number;
    perPage: number;
    kuery?: string;
  };
}

export interface GetPackagePoliciesResponse {
  items: PackagePolicy[];
  total: number;
  page: number;
  perPage: number;
  success: boolean;
}

export interface GetOnePackagePolicyRequest {
  params: {
    packagePolicyId: string;
  };
}

export interface GetOnePackagePolicyResponse {
  item: PackagePolicy;
  success: boolean;
}

export interface CreatePackagePolicyRequest {
  body: NewPackagePolicy;
}

export interface CreatePackagePolicyResponse {
  item: PackagePolicy;
  success: boolean;
}

export type UpdatePackagePolicyRequest = GetOnePackagePolicyRequest & {
  body: UpdatePackagePolicy;
};

export type UpdatePackagePolicyResponse = CreatePackagePolicyResponse;

export interface DeletePackagePoliciesRequest {
  body: {
    packagePolicyIds: string[];
  };
}

export type DeletePackagePoliciesResponse = Array<{
  id: string;
  success: boolean;
}>;
