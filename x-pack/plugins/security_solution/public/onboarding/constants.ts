/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export const PAGE_CONTENT_WIDTH = '1150px';

export enum OnboardingTopicId {
  default = 'default',
  siemMigrations = 'siem_migrations',
}

export enum OnboardingCardId {
  integrations = 'integrations',
  dashboards = 'dashboards',
  rules = 'rules',
  alerts = 'alerts',
  assistant = 'assistant',
  attackDiscovery = 'attack_discovery',

  // siem_migrations topic cards
  siemMigrationsAiConnectors = 'ai_connectors',
  siemMigrationsStart = 'start',
}

export const LocalStorageKey = {
  avcBannerDismissed: 'ONBOARDING_HUB.AVC_BANNER_DISMISSED',
  videoVisited: 'ONBOARDING_HUB.VIDEO_VISITED',
  completeCards: 'ONBOARDING_HUB.COMPLETE_CARDS',
  expandedCard: 'ONBOARDING_HUB.EXPANDED_CARD',
  urlDetails: 'ONBOARDING_HUB.URL_DETAILS',
  selectedIntegrationTabId: 'ONBOARDING_HUB.SELECTED_INTEGRATION_TAB_ID',
  integrationSearchTerm: 'ONBOARDING_HUB.INTEGRATION_SEARCH_TERM',
  siemMigrationsConnectorId: 'ONBOARDING_HUB.SIEM_MIGRATIONS_CONNECTOR_ID',
} as const;
