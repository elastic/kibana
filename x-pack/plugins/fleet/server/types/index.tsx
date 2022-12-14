/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type {
  Agent,
  AgentMetadata,
  AgentSOAttributes,
  AgentStatus,
  AgentType,
  AgentAction,
  ActionStatus,
  CurrentUpgrade,
  PackagePolicy,
  PackagePolicyInput,
  PackagePolicyInputStream,
  NewPackagePolicy,
  UpdatePackagePolicy,
  DryRunPackagePolicy,
  PackagePolicySOAttributes,
  FullAgentPolicyInput,
  FullAgentPolicy,
  FullAgentPolicyOutput,
  AgentPolicy,
  AgentPolicySOAttributes,
  NewAgentPolicy,
  PreconfiguredAgentPolicy,
  AgentPolicyStatus,
  DataStream,
  Output,
  NewOutput,
  OutputSOAttributes,
  OutputType,
  EnrollmentAPIKey,
  EnrollmentAPIKeySOAttributes,
  NewFleetServerHost,
  FleetServerHost,
  FleetServerHostSOAttributes,
  NewFleetProxy,
  FleetProxy,
  FleetProxySOAttributes,
  Installation,
  EpmPackageInstallStatus,
  InstallationStatus,
  PackageInfo,
  ArchivePackage,
  RegistryVarsEntry,
  RegistryDataStream,
  RegistryElasticsearch,
  AssetReference,
  EsAssetReference,
  KibanaAssetReference,
  RegistryPackage,
  BundledPackage,
  InstallablePackage,
  AssetType,
  Installable,
  AssetParts,
  AssetsGroupedByServiceByType,
  CategoryId,
  CategorySummaryList,
  IndexTemplate,
  RegistrySearchResults,
  RegistrySearchResult,
  IndexTemplateEntry,
  IndexTemplateMappings,
  TemplateMap,
  TemplateMapEntry,
  Settings,
  SettingsSOAttributes,
  InstallType,
  InstallSource,
  InstallResult,
  GetCategoriesRequest,
  DataType,
  FleetServerEnrollmentAPIKey,
  FleetServerAgent,
  FleetServerAgentAction,
  FleetServerPolicy,
  FullAgentPolicyInputStream,
  DownloadSourceBase,
  DownloadSource,
  DownloadSourceAttributes,
  PackageVerificationStatus,
  BulkInstallPackageInfo,
  PackageAssetReference,
  ExperimentalDataStreamFeature,
} from '../../common/types';
export { ElasticsearchAssetType, KibanaAssetType, KibanaSavedObjectType } from '../../common/types';
export { dataTypes } from '../../common/constants';

export type AgentPolicyUpdateHandler = (
  action: 'created' | 'updated' | 'deleted',
  agentPolicyId: string
) => Promise<void>;

export interface BulkActionResult {
  id: string;
  success: boolean;
  error?: Error;
}

import type { PackageVerificationStatus } from '../../common/types';
export interface PackageVerificationResult {
  verificationKeyId?: string;
  verificationStatus: PackageVerificationStatus;
}

export * from './models';
export * from './rest_spec';
export * from './extensions';
export type { FleetRequestHandler, FleetRequestHandlerContext } from './request_context';
