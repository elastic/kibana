/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  // Object types
  Agent,
  AgentMetadata,
  AgentSOAttributes,
  AgentStatus,
  AgentType,
  AgentAction,
  AgentPolicyAction,
  AgentPolicyActionV7_9,
  BaseAgentActionSOAttributes,
  AgentActionSOAttributes,
  AgentPolicyActionSOAttributes,
  PackagePolicy,
  PackagePolicyInput,
  PackagePolicyInputStream,
  NewPackagePolicy,
  UpdatePackagePolicy,
  DryRunPackagePolicyInput,
  DryRunPackagePolicy,
  PackagePolicySOAttributes,
  FullAgentPolicyInput,
  FullAgentPolicy,
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
  ElasticsearchAssetType,
  RegistryPackage,
  InstallablePackage,
  AssetType,
  Installable,
  KibanaAssetType,
  KibanaSavedObjectType,
  AssetParts,
  AssetsGroupedByServiceByType,
  CategoryId,
  CategorySummaryList,
  IndexTemplate,
  RegistrySearchResults,
  RegistrySearchResult,
  DefaultPackages,
  TemplateRef,
  IndexTemplateMappings,
  Settings,
  SettingsSOAttributes,
  InstallType,
  InstallSource,
  InstallResult,
  GetCategoriesRequest,
  DataType,
  dataTypes,
  // Fleet Server types
  FleetServerEnrollmentAPIKey,
  FleetServerAgent,
  FleetServerAgentAction,
  FleetServerPolicy,
} from '../../common';

export type AgentPolicyUpdateHandler = (
  action: 'created' | 'updated' | 'deleted',
  agentPolicyId: string
) => Promise<void>;

export interface BulkActionResult {
  id: string;
  success: boolean;
  error?: Error;
}

export * from './models';
export * from './rest_spec';
