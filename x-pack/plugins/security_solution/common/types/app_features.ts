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
   * Enables access to the Endpoint List and associated views that allows management of hosts
   * running endpoint security
   */
  endpointHostManagement = 'endpoint_host_management',

  /**
   * Enables endpoint policy views that enables user to manage endpoint security policies
   */
  endpointPolicyManagement = 'endpoint_policy_management',

  /**
   * Enables Endpoint Policy protections (like Malware, Ransomware, etc)
   */
  endpointPolicyProtections = 'endpoint_policy_protections',

  /**
   * Enables management of all endpoint related artifacts (ex. Trusted Applications, Event Filters,
   * Host Isolation Exceptions, Blocklist.
   */
  endpointArtifactManagement = 'endpoint_artifact_management',

  /**
   * Enables all of endpoint's supported response actions - like host isolation, file operations,
   * process operations, command execution, etc.
   */
  endpointResponseActions = 'endpoint_response_actions',

  /**
   * Enables Threat Intelligence
   */
  threatIntelligence = 'threat-intelligence',

  /**
   * Enables Osquery Response Actions
   */
  osqueryAutomatedResponseActions = 'osquery_automated_response_actions',
}

export enum AppFeatureAssistantKey {
  /**
   * Enables Elastic AI Assistant
   */
  assistant = 'assistant',
}

export enum AppFeatureCasesKey {
  /**
   * Enables Cases Connectors
   */
  casesConnectors = 'cases_connectors',
}

// Merges the two enums.
export type AppFeatureKey = AppFeatureSecurityKey | AppFeatureCasesKey | AppFeatureAssistantKey;
export type AppFeatureKeys = AppFeatureKey[];

// We need to merge the value and the type and export both to replicate how enum works.
export const AppFeatureKey = {
  ...AppFeatureSecurityKey,
  ...AppFeatureCasesKey,
  ...AppFeatureAssistantKey,
};
export const ALL_APP_FEATURE_KEYS = Object.freeze(Object.values(AppFeatureKey));
