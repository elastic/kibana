/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { LegacyScopedClusterClient } from 'src/core/server';

export {
  // Object types
  Agent,
  AgentMetadata,
  AgentSOAttributes,
  AgentStatus,
  AgentType,
  NewAgentEvent,
  AgentEvent,
  AgentEventSOAttributes,
  AgentAction,
  AgentActionSOAttributes,
  PackagePolicy,
  PackagePolicyInput,
  PackagePolicyInputStream,
  NewPackagePolicy,
  UpdatePackagePolicy,
  PackagePolicySOAttributes,
  FullAgentPolicyInput,
  FullAgentPolicy,
  AgentPolicy,
  AgentPolicySOAttributes,
  NewAgentPolicy,
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
  RegistryVarsEntry,
  Dataset,
  RegistryElasticsearch,
  AssetReference,
  EsAssetReference,
  KibanaAssetReference,
  ElasticsearchAssetType,
  RegistryPackage,
  AssetType,
  Installable,
  KibanaAssetType,
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
} from '../../common';

export type CallESAsCurrentUser = LegacyScopedClusterClient['callAsCurrentUser'];

export type AgentPolicyUpdateHandler = (
  action: 'created' | 'updated' | 'deleted',
  agentPolicyId: string
) => Promise<void>;

export * from './models';
export * from './rest_spec';
