/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DeepReadonly } from 'utility-types';

import type { RequestHandlerContext } from '../../../../../src/core/server';
import type { KibanaRequest } from '../../../../../src/core/server/http/router/request';
import type {
  NewPackagePolicy,
  UpdatePackagePolicy,
} from '../../common/types/models/package_policy';
import type { DeletePackagePoliciesResponse } from '../../common/types/rest_spec/package_policy';

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
