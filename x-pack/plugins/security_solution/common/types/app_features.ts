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

  /**
   * Enables Investigation guide in Timeline
   */
  investigationGuide = 'investigation_guide',

  /**
   * Enables Endpoint Response Actions like isolate host, trusted apps, blocklist, etc.
   */
  endpointResponseActions = 'endpoint_response_actions',
  /**
   * Enables Endpoint Exceptions like isolate host, trusted apps, blocklist, etc.
   */
  endpointExceptions = 'endpoint_exceptions',
}

export enum AppFeatureCasesKey {
  /**
   * Enables Cases Connectors
   */
  casesConnectors = 'cases_connectors',
}

// Merges the two enums.
export type AppFeatureKey = AppFeatureSecurityKey | AppFeatureCasesKey;
export type AppFeatureKeys = AppFeatureKey[];

// We need to merge the value and the type and export both to replicate how enum works.
export const AppFeatureKey = { ...AppFeatureSecurityKey, ...AppFeatureCasesKey };
export const ALL_APP_FEATURE_KEYS = Object.freeze(Object.values(AppFeatureKey));
