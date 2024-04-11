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
  /**
   * Used in the Security Solutions guided onboarding tour.
   * Returns JSON corresponding to the tour guide  config as
   * defined by type { GuideConfig } from '@kbn/guided-onboarding';
   */
  'security-solutions.guided-onboarding-content' = 'security-solutions.guided-onboarding-content',

  /**
   * Used in cloud chat plugin to enable/disable the chat.
   * The expectation that the chat is enabled by default and the flag is used as a runtime kill switch.
   */
  'cloud-chat.enabled' = 'cloud-chat.enabled',
  /**
   * Used in cloud chat plugin to switch between the chat variants.
   * Options are: 'header' (the chat button appears as part of the kibana header) and 'bubble' (floating chat button at the bottom of the screen).
   */
  'cloud-chat.chat-variant' = 'cloud-chat.chat-variant',
  /**
   * Used to enable the new stack navigation around solutions during the rollout period.
   */
  'navigation.solutionNavEnabled' = 'navigation.solutionNavEnabled',
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
