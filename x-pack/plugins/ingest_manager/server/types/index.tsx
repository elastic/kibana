/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ScopedClusterClient } from 'src/core/server';

export {
  // Object types
  Agent,
  AgentMetadata,
  AgentSOAttributes,
  AgentStatus,
  AgentType,
  AgentEvent,
  AgentEventSOAttributes,
  AgentAction,
  AgentActionSOAttributes,
  Datasource,
  NewDatasource,
  FullAgentConfigDatasource,
  FullAgentConfig,
  AgentConfig,
  NewAgentConfig,
  AgentConfigStatus,
  DataStream,
  Output,
  NewOutput,
  OutputType,
  EnrollmentAPIKey,
  EnrollmentAPIKeySOAttributes,
  Installation,
  InstallationStatus,
  PackageInfo,
  RegistryVarsEntry,
  Dataset,
  AssetReference,
  ElasticsearchAssetType,
  IngestAssetType,
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

export type CallESAsCurrentUser = ScopedClusterClient['callAsCurrentUser'];

export type AgentConfigUpdateHandler = (
  action: 'created' | 'updated' | 'deleted',
  agentConfigId: string
) => Promise<void>;

export * from './models';
export * from './rest_spec';
