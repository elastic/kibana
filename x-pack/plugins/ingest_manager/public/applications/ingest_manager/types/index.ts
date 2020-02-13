/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
export {
  // Object types
  Agent,
  AgentConfig,
  NewAgentConfig,
  AgentEvent,
  EnrollmentAPIKey,
  Datasource,
  // API schemas - Agent Config
  GetAgentConfigsResponse,
  GetOneAgentConfigResponse,
  CreateAgentConfigRequestSchema,
  CreateAgentConfigResponse,
  UpdateAgentConfigRequestSchema,
  UpdateAgentConfigResponse,
  DeleteAgentConfigsRequestSchema,
  DeleteAgentConfigsResponse,
  // API schemas - Agents
  GetAgentsResponse,
  GetAgentsRequestSchema,
  GetOneAgentResponse,
  PostAgentUnenrollResponse,
  GetOneAgentEventsRequestSchema,
  GetOneAgentEventsResponse,
  // API schemas - Enrollment API Keys
  GetEnrollmentAPIKeysResponse,
  GetOneEnrollmentAPIKeyResponse,
  // EPM types
  AssetReference,
  AssetsGroupedByServiceByType,
  AssetType,
  AssetTypeToParts,
  CategoryId,
  CategorySummaryItem,
  CategorySummaryList,
  ElasticsearchAssetType,
  KibanaAssetType,
  PackageInfo,
  PackageList,
  PackageListItem,
  PackagesGroupedByStatus,
  RequirementsByServiceName,
  RequirementVersion,
  ScreenshotItem,
  ServiceName,
  GetCategoriesResponse,
  GetPackagesResponse,
  GetInfoResponse,
} from '../../../../common';

// Calling Object.entries(PackagesGroupedByStatus) gave `status: string`
// which causes a "string is not assignable to type InstallationStatus` error
// see https://github.com/Microsoft/TypeScript/issues/20322
// and https://github.com/Microsoft/TypeScript/pull/12253#issuecomment-263132208
// and https://github.com/Microsoft/TypeScript/issues/21826#issuecomment-479851685
export const entries = Object.entries as <T>(o: T) => Array<[keyof T, T[keyof T]]>;
