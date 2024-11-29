/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AuthenticatedUser,
  KibanaRequest,
  Logger,
  RequestHandlerContext,
  ElasticsearchClient,
  SavedObjectsClientContract,
} from '@kbn/core/server';

import type { SavedObjectError } from '@kbn/core-saved-objects-common';

import type { HTTPAuthorizationHeader } from '../../common/http_authorization_header';

import type {
  PostDeletePackagePoliciesResponse,
  UpgradePackagePolicyResponse,
  PackageInfo,
  ListWithKuery,
  ListResult,
  UpgradePackagePolicyDryRunResponseItem,
} from '../../common';
import type {
  DeletePackagePoliciesResponse,
  ExperimentalDataStreamFeature,
} from '../../common/types';
import type { NewPackagePolicy, UpdatePackagePolicy, PackagePolicy } from '../types';
import type { ExternalCallback } from '..';

import type { NewPackagePolicyWithId } from './package_policy';

export interface PackagePolicyService {
  asScoped(request: KibanaRequest): PackagePolicyClient;
  get asInternalUser(): PackagePolicyClient;
}

export type RunExternalCallbacksPackagePolicyArgument<A extends ExternalCallback[0]> =
  A extends 'packagePolicyDelete'
    ? DeletePackagePoliciesResponse
    : A extends 'packagePolicyPostDelete'
    ? PostDeletePackagePoliciesResponse
    : A extends 'packagePolicyCreate'
    ? NewPackagePolicy
    : A extends 'packagePolicyPostCreate'
    ? PackagePolicy
    : A extends 'packagePolicyUpdate'
    ? UpdatePackagePolicy
    : A extends 'packagePolicyPostUpdate'
    ? PackagePolicy
    : never;

export type RunExternalCallbacksPackagePolicyResponse<A extends ExternalCallback[0]> =
  A extends 'packagePolicyDelete'
    ? void
    : A extends 'packagePolicyPostDelete'
    ? void
    : A extends 'packagePolicyCreate'
    ? NewPackagePolicy
    : A extends 'packagePolicyPostCreate'
    ? PackagePolicy
    : A extends 'packagePolicyUpdate'
    ? UpdatePackagePolicy
    : A extends 'packagePolicyPostUpdate'
    ? PackagePolicy
    : undefined;

export interface PackagePolicyClient {
  create(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    packagePolicy: NewPackagePolicy,
    options?: {
      spaceId?: string;
      id?: string;
      user?: AuthenticatedUser;
      authorizationHeader?: HTTPAuthorizationHeader | null;
      bumpRevision?: boolean;
      force?: boolean;
      skipEnsureInstalled?: boolean;
      skipUniqueNameVerification?: boolean;
      overwrite?: boolean;
      packageInfo?: PackageInfo;
    },
    context?: RequestHandlerContext,
    request?: KibanaRequest
  ): Promise<PackagePolicy>;

  inspect(
    soClient: SavedObjectsClientContract,
    packagePolicy: NewPackagePolicyWithId
  ): Promise<NewPackagePolicy>;

  bulkCreate(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    packagePolicies: NewPackagePolicyWithId[],
    options?: {
      user?: AuthenticatedUser;
      bumpRevision?: boolean;
      force?: true;
      authorizationHeader?: HTTPAuthorizationHeader | null;
      asyncDeploy?: boolean;
    }
  ): Promise<{
    created: PackagePolicy[];
    failed: Array<{ packagePolicy: NewPackagePolicy; error?: Error | SavedObjectError }>;
  }>;

  bulkUpdate(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    packagePolicyUpdates: UpdatePackagePolicy[],
    options?: { user?: AuthenticatedUser; force?: boolean; asyncDeploy?: boolean },
    currentVersion?: string
  ): Promise<{
    updatedPolicies: PackagePolicy[] | null;
    failedPolicies: Array<{
      packagePolicy: NewPackagePolicyWithId;
      error: Error | SavedObjectError;
    }>;
  }>;

  get(soClient: SavedObjectsClientContract, id: string): Promise<PackagePolicy | null>;

  findAllForAgentPolicy(
    soClient: SavedObjectsClientContract,
    agentPolicyId: string
  ): Promise<PackagePolicy[]>;

  getByIDs(
    soClient: SavedObjectsClientContract,
    ids: string[],
    options?: { ignoreMissing?: boolean }
  ): Promise<PackagePolicy[] | null>;

  list(
    soClient: SavedObjectsClientContract,
    options: ListWithKuery & { spaceId?: string }
  ): Promise<ListResult<PackagePolicy>>;

  listIds(
    soClient: SavedObjectsClientContract,
    options: ListWithKuery
  ): Promise<ListResult<string>>;

  update(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    id: string,
    packagePolicyUpdate: UpdatePackagePolicy,
    options?: { user?: AuthenticatedUser; force?: boolean; skipUniqueNameVerification?: boolean },
    currentVersion?: string
  ): Promise<PackagePolicy>;

  delete(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    ids: string[],
    options?: {
      user?: AuthenticatedUser;
      skipUnassignFromAgentPolicies?: boolean;
      force?: boolean;
      asyncDeploy?: boolean;
    },
    context?: RequestHandlerContext,
    request?: KibanaRequest
  ): Promise<PostDeletePackagePoliciesResponse>;

  upgrade(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    ids: string[],
    options?: { user?: AuthenticatedUser; force?: boolean },
    packagePolicy?: PackagePolicy,
    pkgVersion?: string
  ): Promise<UpgradePackagePolicyResponse>;

  getUpgradeDryRunDiff(
    soClient: SavedObjectsClientContract,
    id: string,
    packagePolicy?: PackagePolicy,
    pkgVersion?: string
  ): Promise<UpgradePackagePolicyDryRunResponseItem>;

  enrichPolicyWithDefaultsFromPackage(
    soClient: SavedObjectsClientContract,
    newPolicy: NewPackagePolicy
  ): Promise<NewPackagePolicy>;

  buildPackagePolicyFromPackage(
    soClient: SavedObjectsClientContract,
    pkgName: string,
    options?: { logger?: Logger; installMissingPackage?: boolean }
  ): Promise<NewPackagePolicy | undefined>;

  runExternalCallbacks<A extends ExternalCallback[0]>(
    externalCallbackType: A,
    packagePolicy: RunExternalCallbacksPackagePolicyArgument<A>,
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    context?: RequestHandlerContext,
    request?: KibanaRequest
  ): Promise<RunExternalCallbacksPackagePolicyResponse<A>>;

  runDeleteExternalCallbacks(
    deletedPackagePolicies: DeletePackagePoliciesResponse,
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    context?: RequestHandlerContext,
    request?: KibanaRequest
  ): Promise<void>;

  runPostDeleteExternalCallbacks(
    deletedPackagePolicies: PostDeletePackagePoliciesResponse,
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    context?: RequestHandlerContext,
    request?: KibanaRequest
  ): Promise<void>;

  getUpgradePackagePolicyInfo(
    soClient: SavedObjectsClientContract,
    id: string
  ): Promise<{
    packagePolicy: PackagePolicy;
    packageInfo: PackageInfo;
    experimentalDataStreamFeatures: ExperimentalDataStreamFeature[];
  }>;

  /**
   * Remove an output from all package policies that are using it, and replace the output by the default ones.
   * @param soClient
   * @param esClient
   * @param outputId
   */
  removeOutputFromAll(
    esClient: ElasticsearchClient,
    outputId: string,
    options?: { force?: boolean }
  ): Promise<void>;

  /**
   * Returns an `AsyncIterable` for retrieving all integration policy IDs
   * @param soClient
   * @param options
   */
  fetchAllItemIds(
    soClient: SavedObjectsClientContract,
    options?: PackagePolicyClientFetchAllItemIdsOptions
  ): Promise<AsyncIterable<string[]>>;

  /**
   * Returns an `AsyncIterable` for retrieving all integration policies
   * @param soClient
   * @param options
   */
  fetchAllItems(
    soClient: SavedObjectsClientContract,
    options?: PackagePolicyClientFetchAllItemsOptions
  ): Promise<AsyncIterable<PackagePolicy[]>>;
}

export type PackagePolicyClientFetchAllItemIdsOptions = Pick<ListWithKuery, 'perPage' | 'kuery'>;

export type PackagePolicyClientFetchAllItemsOptions = Pick<
  ListWithKuery,
  'perPage' | 'kuery' | 'sortField' | 'sortOrder'
>;
