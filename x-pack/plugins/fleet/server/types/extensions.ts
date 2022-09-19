/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, RequestHandlerContext } from '@kbn/core/server';

import type { DeepReadonly } from 'utility-types';

import type {
  DeletePackagePoliciesResponse,
  NewPackagePolicy,
  UpdatePackagePolicy,
  PackagePolicy,
  UpgradePackagePolicyResponse,
} from '../../common/types';

export type PostPackagePolicyDeleteCallback = (
  deletedPackagePolicies: DeepReadonly<DeletePackagePoliciesResponse>
) => Promise<void>;

export type PostPackagePolicyCreateCallback = (
  newPackagePolicy: NewPackagePolicy,
  context: RequestHandlerContext,
  request: KibanaRequest
) => Promise<NewPackagePolicy>;

export type PostPackagePolicyPostCreateCallback = (
  packagePolicy: PackagePolicy,
  context: RequestHandlerContext,
  request: KibanaRequest
) => Promise<PackagePolicy>;

export type PutPackagePolicyUpdateCallback = (
  updatePackagePolicy: UpdatePackagePolicy,
  context: RequestHandlerContext,
  request: KibanaRequest
) => Promise<UpdatePackagePolicy>;

// TODO - Ofir edit this function
export type PostPackagePolicyPostUpgradeCallback = (
  packagePolicy: UpgradePackagePolicyResponse,
  context: RequestHandlerContext,
  request: KibanaRequest
) => Promise<void>;

export type ExternalCallbackCreate = ['packagePolicyCreate', PostPackagePolicyCreateCallback];
export type ExternalCallbackPostCreate = [
  'packagePolicyPostCreate',
  PostPackagePolicyPostCreateCallback
];
export type ExternalCallbackDelete = ['postPackagePolicyDelete', PostPackagePolicyDeleteCallback];
export type ExternalCallbackUpdate = ['packagePolicyUpdate', PutPackagePolicyUpdateCallback];
export type ExternalCallbackPostUpgrade = [
  'packagePolicyPostUpgrade',
  PostPackagePolicyPostUpgradeCallback
];
/**
 * Callbacks supported by the Fleet plugin
 */
export type ExternalCallback =
  | ExternalCallbackCreate
  | ExternalCallbackPostCreate
  | ExternalCallbackDelete
  | ExternalCallbackUpdate
  | ExternalCallbackPostUpgrade;

export type ExternalCallbacksStorage = Map<ExternalCallback[0], Set<ExternalCallback[1]>>;
