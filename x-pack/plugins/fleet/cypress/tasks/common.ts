/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode } from '@kbn/rison';

import { API_VERSIONS } from '../../common';

import type { ROLES } from './privileges';

import { getUrlWithRoute } from './login';

const LOADING_INDICATOR = '[data-test-subj="globalLoadingIndicator"]';
const LOADING_INDICATOR_HIDDEN = '[data-test-subj="globalLoadingIndicator-hidden"]';

// Grab username + password from environment variables
export const API_AUTH = Object.freeze({
  user: Cypress.env('KIBANA_USERNAME') ?? Cypress.env('ELASTICSEARCH_USERNAME'),
  pass: Cypress.env('KIBANA_PASSWORD') ?? Cypress.env('ELASTICSEARCH_PASSWORD'),
});

export const COMMON_API_HEADERS = Object.freeze({
  'kbn-xsrf': 'cypress',
  'x-elastic-internal-origin': 'fleet',
  'Elastic-Api-Version': API_VERSIONS.public.v1,
});

// Replaces request - adds baseline authentication + global headers
export const request = <T = unknown>({
  headers,
  ...options
}: Partial<Cypress.RequestOptions>): Cypress.Chainable<Cypress.Response<T>> => {
  return cy.request<T>({
    auth: API_AUTH,
    headers: { ...COMMON_API_HEADERS, ...headers },
    ...options,
  });
};

/**
 * For all the new features tours we show in the app, this method disables them
 * by setting their configs in the local storage. It prevents the tours from appearing
 * on the page during test runs and covering other UI elements.
 * @param window - browser's window object
 */

const NEW_FEATURES_TOUR_STORAGE_KEYS = {
  RULE_MANAGEMENT_PAGE: 'securitySolution.rulesManagementPage.newFeaturesTour.v8.9',
  TIMELINES: 'securitySolution.security.timelineFlyoutHeader.saveTimelineTour',
  TIMELINE: 'securitySolution.timeline.newFeaturesTour.v8.12',
  FLYOUT: 'securitySolution.documentDetails.newFeaturesTour.v8.14',
};

const disableNewFeaturesTours = (window: Window) => {
  const tourStorageKeys = Object.values(NEW_FEATURES_TOUR_STORAGE_KEYS);
  const tourConfig = {
    isTourActive: false,
  };

  tourStorageKeys.forEach((key) => {
    window.localStorage.setItem(key, JSON.stringify(tourConfig));
  });
};

export const waitForPageToBeLoaded = () => {
  cy.get(LOADING_INDICATOR_HIDDEN).should('exist');
  cy.get(LOADING_INDICATOR).should('not.exist');
};

export const visit = (url: string, options: Partial<Cypress.VisitOptions> = {}, role?: ROLES) => {
  const timerangeConfig = {
    from: 1547914976217,
    fromStr: '2019-01-19T16:22:56.217Z',
    kind: 'relative',
    to: 1579537385745,
    toStr: 'now',
  };

  const timerange = encode({
    global: {
      linkTo: ['timeline'],
      timerange: timerangeConfig,
    },
    timeline: {
      linkTo: ['global'],
      timerange: timerangeConfig,
    },
  });

  cy.visit(role ? getUrlWithRoute(role, url) : url, {
    ...options,
    qs: {
      ...options.qs,
      timerange,
    },
    onBeforeLoad: (win) => {
      options.onBeforeLoad?.(win);

      disableNewFeaturesTours(win);
    },
    onLoad: (win) => {
      options.onLoad?.(win);
    },
  });
  waitForPageToBeLoaded();
};
