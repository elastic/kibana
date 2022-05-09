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
  AgentPolicyAction,
  BaseAgentActionSOAttributes,
  AgentActionSOAttributes,
  AgentPolicyActionSOAttributes,
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
} from '../../common';
export {
  ElasticsearchAssetType,
  KibanaAssetType,
  KibanaSavedObjectType,
  dataTypes,
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
export * from './extensions';
export type { FleetRequestHandler, FleetRequestHandlerContext } from './request_context';
