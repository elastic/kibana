/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type {
  ElasticsearchClient,
  RequestHandlerContext,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { AuthenticatedUser } from '@kbn/security-plugin/server';

import type {
  DeletePackagePoliciesResponse,
  UpgradePackagePolicyResponse,
  PackageInfo,
  ListWithKuery,
  ListResult,
  UpgradePackagePolicyDryRunResponseItem,
} from '../../common';
import type { NewPackagePolicy, UpdatePackagePolicy, PackagePolicy } from '../types';
import type { ExternalCallback } from '..';

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
    }
  ): Promise<PackagePolicy>;

  bulkCreate(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    packagePolicies: NewPackagePolicy[],
    agentPolicyId: string,
    options?: { user?: AuthenticatedUser; bumpRevision?: boolean }
  ): Promise<PackagePolicy[]>;

  get(soClient: SavedObjectsClientContract, id: string): Promise<PackagePolicy | null>;

  getByIDs(soClient: SavedObjectsClientContract, ids: string[]): Promise<PackagePolicy[] | null>;

  list(
    soClient: SavedObjectsClientContract,
    options: ListWithKuery
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
    options?: { user?: AuthenticatedUser; force?: boolean },
    currentVersion?: string
  ): Promise<PackagePolicy>;

  delete(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    ids: string[],
    options?: { user?: AuthenticatedUser; skipUnassignFromAgentPolicies?: boolean; force?: boolean }
  ): Promise<DeletePackagePoliciesResponse>;

  upgrade(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    ids: string[],
    options?: { user?: AuthenticatedUser },
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
    pkgName: string
  ): Promise<NewPackagePolicy | undefined>;

  runExternalCallbacks<A extends ExternalCallback[0]>(
    externalCallbackType: A,
    packagePolicy: A extends 'postPackagePolicyDelete'
      ? DeletePackagePoliciesResponse
      : A extends 'packagePolicyPostCreate'
      ? PackagePolicy
      : NewPackagePolicy,
    context: RequestHandlerContext,
    request: KibanaRequest
  ): Promise<
    A extends 'postPackagePolicyDelete'
      ? void
      : A extends 'packagePolicyPostCreate'
      ? PackagePolicy
      : NewPackagePolicy
  >;

  runDeleteExternalCallbacks(deletedPackagePolicies: DeletePackagePoliciesResponse): Promise<void>;

  getUpgradePackagePolicyInfo(
    soClient: SavedObjectsClientContract,
    id: string
  ): Promise<{ packagePolicy: PackagePolicy; packageInfo: PackageInfo }>;
}
