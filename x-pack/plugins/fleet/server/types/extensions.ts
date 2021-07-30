/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, RequestHandlerContext } from 'kibana/server';

import type {
  DeletePackagePoliciesResponse,
  NewPackagePolicy,
  UpdatePackagePolicy,
} from '../../common';

/**
 * Callbacks supported by the Fleet plugin
 */
export type ExternalCallback =
  | [
      'packagePolicyCreate',
      (
        newPackagePolicy: NewPackagePolicy,
        context: RequestHandlerContext,
        request: KibanaRequest
      ) => Promise<NewPackagePolicy>
    ]
  | [
      'postPackagePolicyDelete',
      (
        deletedPackagePolicies: DeletePackagePoliciesResponse,
        context: RequestHandlerContext,
        request: KibanaRequest
      ) => Promise<void>
    ]
  | [
      'packagePolicyUpdate',
      (
        updatePackagePolicy: UpdatePackagePolicy,
        context: RequestHandlerContext,
        request: KibanaRequest
      ) => Promise<UpdatePackagePolicy>
    ];

export type ExternalCallbacksStorage = Map<ExternalCallback[0], Set<ExternalCallback[1]>>;
