/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RoleMapping } from '../../../shared/types';
import { Engine } from '../../components/engine/types';

export type RoleTypes = 'owner' | 'admin' | 'dev' | 'editor' | 'analyst';
export type AbilityTypes = 'manage' | 'edit' | 'view';

export interface Role {
  id: string;
  roleType: RoleTypes;
  availableRoleTypes: RoleTypes[];
  credentialTypes: string[];
  canAccessAllEngines: boolean;
  can(action: AbilityTypes, subject: string): boolean;
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
  canManageEngineResultSettings: boolean;
  canManageEngineSchema: boolean;
  canManageEngineSearchUi: boolean;
  canManageMetaEngineSourceEngines: boolean;
}

export interface ASRoleMapping extends RoleMapping {
  accessAllEngines: boolean;
  engines: Engine[];
}

export interface AdvanceRoleType {
  id: RoleTypes;
  description: string;
}
