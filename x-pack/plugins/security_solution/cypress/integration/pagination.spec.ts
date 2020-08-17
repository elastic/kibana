/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PROCESS_NAME_FIELD } from '../screens/hosts/uncommon_processes';
import { FIRST_PAGE_SELECTOR, THIRD_PAGE_SELECTOR } from '../screens/pagination';

import { waitForAuthenticationsToBeLoaded } from '../tasks/hosts/authentications';
import { openAuthentications, openUncommonProcesses } from '../tasks/hosts/main';
import { waitForUncommonProcessesToBeLoaded } from '../tasks/hosts/uncommon_processes';
import { loginAndWaitForPage } from '../tasks/login';
import { goToFirstPage, goToThirdPage } from '../tasks/pagination';
import { refreshPage } from '../tasks/security_header';

import { HOSTS_PAGE_TAB_URLS } from '../urls/navigation';

describe('Pagination', () => {
  before(() => {
    loginAndWaitForPage(HOSTS_PAGE_TAB_URLS.uncommonProcesses);
    waitForUncommonProcessesToBeLoaded();
  });

  afterEach(() => {
    goToFirstPage();
  });

  it('pagination updates results and page number', () => {
    cy.get(FIRST_PAGE_SELECTOR).should('have.class', 'euiPaginationButton-isActive');

    cy.get(PROCESS_NAME_FIELD)
      .first()
      .invoke('text')
      .then((processNameFirstPage) => {
        goToThirdPage();
        waitForUncommonProcessesToBeLoaded();
        cy.get(PROCESS_NAME_FIELD)
          .first()
          .invoke('text')
          .should((processNameSecondPage) => {
            expect(processNameFirstPage).not.to.eq(processNameSecondPage);
          });
      });
    cy.get(FIRST_PAGE_SELECTOR).should('not.have.class', 'euiPaginationButton-isActive');
    cy.get(THIRD_PAGE_SELECTOR).should('have.class', 'euiPaginationButton-isActive');
  });

  it('pagination keeps track of page results when tabs change', () => {
    cy.get(FIRST_PAGE_SELECTOR).should('have.class', 'euiPaginationButton-isActive');
    goToThirdPage();
    waitForUncommonProcessesToBeLoaded();

    cy.get(PROCESS_NAME_FIELD)
      .first()
      .invoke('text')
      .then((expectedThirdPageResult) => {
        openAuthentications();
        waitForAuthenticationsToBeLoaded();
        cy.get(FIRST_PAGE_SELECTOR).should('have.class', 'euiPaginationButton-isActive');
        openUncommonProcesses();
        waitForUncommonProcessesToBeLoaded();
        cy.get(THIRD_PAGE_SELECTOR).should('have.class', 'euiPaginationButton-isActive');
        cy.get(PROCESS_NAME_FIELD)
          .first()
          .invoke('text')
          .should((actualThirdPageResult) => {
            expect(expectedThirdPageResult).to.eq(actualThirdPageResult);
          });
      });
  });

  it('pagination resets results and page number to first page when refresh is clicked', () => {
    cy.get(FIRST_PAGE_SELECTOR).should('have.class', 'euiPaginationButton-isActive');
    goToThirdPage();
    waitForUncommonProcessesToBeLoaded();
    cy.get(FIRST_PAGE_SELECTOR).should('not.have.class', 'euiPaginationButton-isActive');
    refreshPage();
    waitForUncommonProcessesToBeLoaded();
    cy.get(FIRST_PAGE_SELECTOR).should('have.class', 'euiPaginationButton-isActive');
  });
});
