/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export * from '../../../common/types/app_search';

export type TRole = 'owner' | 'admin' | 'dev' | 'editor' | 'analyst';

export interface IRole {
  id: string;
  roleType: TRole;
  availableRoleTypes: TRole[];
  credentialTypes: string[];
  canAccessAllEngines: boolean;
  can(action: string, subject: string): boolean;
  canViewEngines: boolean;
  canViewMetaEngines: boolean;
  canViewAccountCredentials: boolean;
  canViewEngineAnalytics: boolean;
  canViewEngineApiLogs: boolean;
  canViewEngineCrawler: boolean;
  canViewEngineCredentials: boolean;
  canViewEngineDocuments: boolean;
  canViewEngineSchema: boolean;
  canViewEngineQueryTester: boolean;
  canViewMetaEngineSourceEngines: boolean;
  canViewSettings: boolean;
  canViewRoleMappings: boolean;
  canManageEngines: boolean;
  canManageMetaEngines: boolean;
  canManageLogSettings: boolean;
  canManageSettings: boolean;
  canManageEngineCrawler: boolean;
  canManageEngineDocuments: boolean;
  canManageEngineSynonyms: boolean;
  canManageEngineCredentials: boolean;
  canManageEngineCurations: boolean;
  canManageEngineRelevanceTuning: boolean;
  canManageEngineReferenceUi: boolean;
  canManageEngineResultSettings: boolean;
  canManageEngineSchema: boolean;
  canManageMetaEngineSourceEngines: boolean;
}
