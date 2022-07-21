/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ALERTS = '[data-test-subj="groupedNavItemLink-alerts"]';

export const BREADCRUMBS = '[data-test-subj="breadcrumbs"] a';

export const CASES = '[data-test-subj="groupedNavItemLink-cases"]';

export const HOSTS = '[data-test-subj="groupedNavPanelLink-hosts"]';

export const KQL_INPUT = '[data-test-subj="queryInput"]';

export const ENDPOINTS = '[data-test-subj="groupedNavPanelLink-endpoints"]';

export const TRUSTED_APPS = '[data-test-subj="groupedNavPanelLink-trusted_apps"]';

export const EVENT_FILTERS = '[data-test-subj="groupedNavPanelLink-event_filters"]';

export const NETWORK = '[data-test-subj="groupedNavPanelLink-network"]';

export const USERS = '[data-test-subj="groupedNavPanelLink-users"]';

export const RULES = '[data-test-subj="groupedNavPanelLink-rules"]';

export const EXCEPTIONS = '[data-test-subj="groupedNavPanelLink-exceptions"]';

export const OVERVIEW = '[data-test-subj="groupedNavPanelLink-overview"]';

export const DETECTION_RESPONSE = '[data-test-subj="groupedNavPanelLink-detection_response"]';

export const REFRESH_BUTTON = '[data-test-subj="querySubmitButton"]';

export const TIMELINES = '[data-test-subj="groupedNavItemLink-timelines"]';

export const LOADING_INDICATOR = '[data-test-subj="globalLoadingIndicator"]';

export const openNavigationPanel = (page: string) => {
  let panel;
  switch (page) {
    case OVERVIEW:
    case DETECTION_RESPONSE: {
      panel = 'dashboards';
      break;
    }
    case HOSTS:
    case NETWORK:
    case USERS: {
      panel = 'explore';
      break;
    }
    case ENDPOINTS:
    case TRUSTED_APPS:
    case EVENT_FILTERS:
    case RULES:
    case EXCEPTIONS: {
      panel = 'administration';
      break;
    }
  }
  if (panel) {
    cy.get(`[data-test-subj="groupedNavItemLink-${panel}"] button`).click({ force: true });
  }
};
