/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * List of feature flag names used in Kibana.
 *
 * Feel free to add/remove entries if needed.
 *
 * As a convention, the key and the value have the same string.
 *
 * @remarks Kept centralized in this place to serve as a repository
 * to help devs understand if there is someone else already using it.
 */
export enum FEATURE_FLAG_NAMES {
  /**
   * Used in the Security Solutions onboarding page.
   * It resolves the URL that the button "Add Integrations" will point to.
   */
  'security-solutions.add-integrations-url' = 'security-solutions.add-integrations-url',
}

/**
 * List of LaunchDarkly metric names used in Kibana.
 *
 * Feel free to add/remove entries if needed.
 *
 * As a convention, the key and the value have the same string.
 *
 * @remarks Kept centralized in this place to serve as a repository
 * to help devs understand if there is someone else already using it.
 */
export enum METRIC_NAMES {}
