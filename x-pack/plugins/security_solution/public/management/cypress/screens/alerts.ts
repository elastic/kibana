/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_ALERTS_PATH } from '../../../../common/constants';

export const navigateToAlertsList = (urlQueryParams: string = '') => {
  cy.visit(`${APP_ALERTS_PATH}${urlQueryParams ? `?${urlQueryParams}` : ''}`);
};

export const clickAlertListRefreshButton = (): Cypress.Chainable => {
  return cy.getByTestSubj('querySubmitButton').click().should('be.enabled');
};

/**
 * Waits until the Alerts list has alerts data and return the number of rows that are currently displayed
 * @param timeout
 */
export const getAlertsTableRows = (timeout?: number): Cypress.Chainable<JQuery<HTMLDivElement>> => {
  let $rows: JQuery<HTMLDivElement> = Cypress.$();

  return cy
    .waitUntil(
      () => {
        clickAlertListRefreshButton();

        return cy
          .getByTestSubj('alertsTable')
          .find<HTMLDivElement>('.euiDataGridRow')
          .then(($rowsFound) => {
            $rows = $rowsFound;
            return Boolean($rows);
          });
      },
      { timeout }
    )
    .then(() => $rows);
};
