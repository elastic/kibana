/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PackagePolicy,
  NewPackagePolicy,
  UpdatePackagePolicy,
  DryRunPackagePolicy,
  PackagePolicyPackage,
  FullAgentPolicyInput,
} from '../models';

import type { BulkGetResult, ListResult, ListWithKuery } from './common';

export interface GetPackagePoliciesRequest {
  query: ListWithKuery;
}

export type GetPackagePoliciesResponse = ListResult<PackagePolicy>;
export type BulkGetPackagePoliciesResponse = BulkGetResult<PackagePolicy>;

export interface GetOnePackagePolicyRequest {
  params: {
    packagePolicyId: string;
  };
}

export interface GetOnePackagePolicyResponse {
  item: PackagePolicy;
}

export interface CreatePackagePolicyRequest {
  body: NewPackagePolicy & { force?: boolean };
}

export interface CreatePackagePolicyResponse {
  item: PackagePolicy;
}

export type UpdatePackagePolicyRequest = GetOnePackagePolicyRequest & {
  body: UpdatePackagePolicy;
};

export type UpdatePackagePolicyResponse = CreatePackagePolicyResponse;

export interface DeletePackagePoliciesRequest {
  body: {
    packagePolicyIds: string[];
    force?: boolean;
  };
}

export type DeletePackagePoliciesResponse = PackagePolicy[];

export type PostDeletePackagePoliciesResponse = Array<{
  id: string;
  name?: string;
  success: boolean;
  package?: PackagePolicyPackage;
  policy_id?: string | null;
  policy_ids?: string[];
  output_id?: string;
  // Support generic errors
  statusCode?: number;
  body?: {
    message: string;
  };
}>;

export interface UpgradePackagePolicyBaseResponse {
  name?: string;

  // Support generic errors
  statusCode?: number;
  body?: {
    message: string;
  };
}

export interface UpgradePackagePolicyDryRunResponseItem extends UpgradePackagePolicyBaseResponse {
  hasErrors: boolean;
  diff?: [PackagePolicy, DryRunPackagePolicy];
  agent_diff?: [FullAgentPolicyInput[]];
}

export type UpgradePackagePolicyDryRunResponse = UpgradePackagePolicyDryRunResponseItem[];

export interface UpgradePackagePolicyResponseItem extends UpgradePackagePolicyBaseResponse {
  id: string;
  success: boolean;
}

export type UpgradePackagePolicyResponse = UpgradePackagePolicyResponseItem[];
