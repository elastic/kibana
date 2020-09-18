/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IAccount } from '../../types';

export type TRole = 'owner' | 'admin' | 'dev' | 'editor' | 'analyst';
export type TAbility = 'manage' | 'edit' | 'view';

export interface IRole {
  id: string;
  roleType: TRole;
  availableRoleTypes: TRole[];
  credentialTypes: string[];
  canAccessAllEngines: boolean;
  can(action: TAbility, subject: string): boolean;
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

/**
 * Transforms the `role` data we receive from the Enterprise Search
 * server into a more convenient format for front-end use
 */
export const getRoleAbilities = (role: IAccount['role']): IRole => {
  // Role ability function helpers
  const myRole = {
    can: (action: TAbility, subject: string): boolean => {
      return (
        role?.ability?.manage?.includes(subject) ||
        (Array.isArray(role.ability[action]) && role.ability[action].includes(subject))
      );
    },
    // TODO: canHaveScopedEngines fn
  };

  // Clone top-level role props, and move some props out of `ability` and into the top-level for convenience
  const topLevelProps = {
    id: role.id,
    roleType: role.roleType as TRole,
    availableRoleTypes: role.ability.availableRoleTypes as TRole[],
    credentialTypes: role.ability.credentialTypes,
  };

  // Ability shorthands (also in top level of role obj for convenience)
  // Example usage: `const { myRole: { canViewSettings } } = useValues(AppLogic);`
  const abilities = {
    canAccessAllEngines: role.ability.accessAllEngines,
    canViewMetaEngines: myRole.can('view', 'account_meta_engines'),
    canViewAccountCredentials: myRole.can('view', 'account_credentials'),
    canViewEngineAnalytics: myRole.can('view', 'engine_analytics'),
    canViewEngineApiLogs: myRole.can('view', 'engine_api_logs'),
    canViewEngineCrawler: myRole.can('view', 'engine_crawler'),
    canViewEngineCredentials: myRole.can('view', 'engine_credentials'),
    canViewEngineDocuments: myRole.can('view', 'engine_documents'),
    canViewEngineSchema: myRole.can('view', 'engine_schema'),
    canViewEngineQueryTester: myRole.can('view', 'engine_query_tester'),
    canViewMetaEngineSourceEngines: myRole.can('view', 'meta_engine_source_engines'),
    canViewSettings: myRole.can('view', 'account_settings'),
    canViewRoleMappings: myRole.can('view', 'role_mappings'),
    canManageEngines: myRole.can('manage', 'account_engines'),
    canManageMetaEngines: myRole.can('manage', 'account_meta_engines'),
    canManageLogSettings: myRole.can('manage', 'account_log_settings'),
    canManageSettings: myRole.can('manage', 'account_settings'),
    canManageEngineCrawler: myRole.can('manage', 'engine_crawler'),
    canManageEngineDocuments: myRole.can('manage', 'engine_documents'),
    canManageEngineSynonyms: myRole.can('manage', 'engine_synonyms'),
    canManageEngineCredentials: myRole.can('manage', 'engine_credentials'),
    canManageEngineCurations: myRole.can('manage', 'engine_curations'),
    canManageEngineRelevanceTuning: myRole.can('manage', 'engine_relevance_tuning'),
    canManageEngineReferenceUi: myRole.can('manage', 'engine_reference_ui'),
    canManageEngineResultSettings: myRole.can('manage', 'engine_result_settings'),
    canManageEngineSchema: myRole.can('manage', 'engine_schema'),
    canManageMetaEngineSourceEngines: myRole.can('manage', 'meta_engine_source_engines'),
  };

  return Object.assign(myRole, topLevelProps, abilities);
};
