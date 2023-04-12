/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface AppFeatureSecurityKeys {
  /**
   * Enables importing pre-packaged rules
   * */
  rules_load_prepackaged: boolean;
  /**
   * Enables the ability to add response actions to rules
   */
  rules_response_actions: boolean;
  /**
   * Enables the ability to perform the isolate hosts operation
   */
  isolate_host: boolean;
}
export type AppFeatureSecurityKey = keyof AppFeatureSecurityKeys;

export interface AppFeatureCasesKeys {
  /**
   * Enables the basic Cases feature
   */
  cases_base: boolean;
}
export type AppFeatureCasesKey = keyof AppFeatureCasesKeys;

export type AppFeatureKeys = AppFeatureSecurityKeys & AppFeatureCasesKeys;
export type AppFeatureKey = keyof AppFeatureKeys;
