/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KIBANA_NAVIGATION_TOGGLE } from '../screens/kibana_navigation';

export const navigateFromKibanaCollapsibleTo = (page: string) => {
  cy.get(page).click();
};

export const openKibanaNavigation = () => {
  cy.get(KIBANA_NAVIGATION_TOGGLE).click();
};

/**
 *
 * @param pathname Path from which you are navigating away
 *
 * @description
 * Function waits until given pathname  is no longer available
 *
 * */
export const waitToNavigateAwayFrom = (pathName: string) => {
  cy.waitUntil(
    () =>
      cy.url().then((urlString) => {
        const url = new URL(urlString);
        return url.pathname !== pathName;
      }),
    {
      timeout: 2000,
      interval: 300,
    }
  );
};
