/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface AppFeatureKeys {
  /**
   * Enables the basic Cases feature
   */
  cases_base: boolean;
  /**
   * Enables importing pre-packaged rules
   * */
  rules_load_prepackaged: boolean;
  /**
   * Enables the ability to add response actions to rules
   */
  rules_response_actions: boolean;
}

export type AppFeatureKey = keyof AppFeatureKeys;
