/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, RequestHandlerContext } from 'kibana/server';

import type { DeepReadonly } from 'utility-types';

import type {
  DeletePackagePoliciesResponse,
  NewPackagePolicy,
  UpdatePackagePolicy,
} from '../../common';

export type PostPackagePolicyDeleteCallback = (
  deletedPackagePolicies: DeepReadonly<DeletePackagePoliciesResponse>
) => Promise<void>;

export type PostPackagePolicyCreateCallback = (
  newPackagePolicy: NewPackagePolicy,
  context: RequestHandlerContext,
  request: KibanaRequest
) => Promise<NewPackagePolicy>;

export type PutPackagePolicyUpdateCallback = (
  updatePackagePolicy: UpdatePackagePolicy,
  context: RequestHandlerContext,
  request: KibanaRequest
) => Promise<UpdatePackagePolicy>;

export type ExternalCallbackCreate = ['packagePolicyCreate', PostPackagePolicyCreateCallback];
export type ExternalCallbackDelete = ['postPackagePolicyDelete', PostPackagePolicyDeleteCallback];
export type ExternalCallbackUpdate = ['packagePolicyUpdate', PutPackagePolicyUpdateCallback];

/**
 * Callbacks supported by the Fleet plugin
 */
export type ExternalCallback =
  | ExternalCallbackCreate
  | ExternalCallbackDelete
  | ExternalCallbackUpdate;

export type ExternalCallbacksStorage = Map<ExternalCallback[0], Set<ExternalCallback[1]>>;
