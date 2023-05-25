/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum AppFeatureSecurityKey {
  /**
   * Enables importing pre-packaged rules
   * */
  rulesLoadPrepackaged = 'rules_load_prepackaged',
  /**
   * Enables the ability to add response actions to rules
   */
  rulesResponseActions = 'rules_response_actions',
}

export enum AppFeatureCasesKey {
  /**
   * Enables the basic Cases feature
   */
  casesBase = 'cases_base',
}

// Merges the two enums.
// We need to merge the value and the type and export both to replicate how enum works.
export const AppFeatureKey = { ...AppFeatureSecurityKey, ...AppFeatureCasesKey };
export type AppFeatureKey = AppFeatureSecurityKey | AppFeatureCasesKey;

type AppFeatureSecurityKeys = { [key in AppFeatureSecurityKey]: boolean };
type AppFeatureCasesKeys = { [key in AppFeatureCasesKey]: boolean };
export type AppFeatureKeys = AppFeatureSecurityKeys & AppFeatureCasesKeys;
