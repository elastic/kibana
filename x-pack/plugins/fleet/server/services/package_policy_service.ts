/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger, RequestHandlerContext } from '@kbn/core/server';
import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { AuthenticatedUser } from '@kbn/security-plugin/server';

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

export interface PackagePolicyClient {
  create(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    packagePolicy: NewPackagePolicy,
    options?: {
      spaceId?: string;
      id?: string;
      user?: AuthenticatedUser;
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

  bulkCreate(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    packagePolicies: NewPackagePolicyWithId[],
    options?: {
      user?: AuthenticatedUser;
      bumpRevision?: boolean;
      force?: true;
    }
  ): Promise<PackagePolicy[]>;

  bulkUpdate(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    packagePolicyUpdates: Array<NewPackagePolicy & { version?: string; id: string }>,
    options?: { user?: AuthenticatedUser; force?: boolean },
    currentVersion?: string
  ): Promise<PackagePolicy[] | null>;

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
    options: ListWithKuery & { withAgentCount?: boolean }
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
    logger?: Logger
  ): Promise<NewPackagePolicy | undefined>;

  runExternalCallbacks<A extends ExternalCallback[0]>(
    externalCallbackType: A,
    packagePolicy: A extends 'packagePolicyDelete'
      ? DeletePackagePoliciesResponse
      : A extends 'packagePolicyPostDelete'
      ? PostDeletePackagePoliciesResponse
      : A extends 'packagePolicyPostCreate'
      ? PackagePolicy
      : A extends 'packagePolicyUpdate'
      ? UpdatePackagePolicy
      : NewPackagePolicy,
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    context?: RequestHandlerContext,
    request?: KibanaRequest
  ): Promise<
    A extends 'packagePolicyDelete'
      ? void
      : A extends 'packagePolicyPostDelete'
      ? void
      : A extends 'packagePolicyPostCreate'
      ? PackagePolicy
      : A extends 'packagePolicyUpdate'
      ? UpdatePackagePolicy
      : NewPackagePolicy
  >;

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
}
