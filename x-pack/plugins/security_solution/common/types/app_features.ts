/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum AppFeatureSecurityKey {
  /**
   * Enables Advanced Insights (Entity Risk, GenAI)
   */
  advancedInsights = 'advanced_insights',
}

export enum AppFeatureCasesKey {
  /**
   * Enables Cases Connectors
   */
  casesConnectors = 'cases_connectors',
}

// Merges the two enums.
// We need to merge the value and the type and export both to replicate how enum works.
export const AppFeatureKey = { ...AppFeatureSecurityKey, ...AppFeatureCasesKey };
export type AppFeatureKey = AppFeatureSecurityKey | AppFeatureCasesKey;

type AppFeatureSecurityKeys = { [key in AppFeatureSecurityKey]: boolean };
type AppFeatureCasesKeys = { [key in AppFeatureCasesKey]: boolean };
export type AppFeatureKeys = AppFeatureSecurityKeys & AppFeatureCasesKeys;
