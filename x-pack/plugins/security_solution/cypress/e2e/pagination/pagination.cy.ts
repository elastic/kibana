/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PROCESS_NAME_FIELD,
  UNCOMMON_PROCESSES_TABLE,
} from '../../screens/hosts/uncommon_processes';
import { FIRST_PAGE_SELECTOR, SECOND_PAGE_SELECTOR } from '../../screens/pagination';
import { esArchiverLoad, esArchiverUnload } from '../../tasks/es_archiver';
import { waitsForEventsToBeLoaded } from '../../tasks/hosts/events';
import { openEvents, openUncommonProcesses } from '../../tasks/hosts/main';
import { waitForUncommonProcessesToBeLoaded } from '../../tasks/hosts/uncommon_processes';
import { login, visit } from '../../tasks/login';
import { goToSecondPage, sortFirstColumn } from '../../tasks/pagination';
import { refreshPage } from '../../tasks/security_header';
import { HOSTS_URL, USERS_URL, HOSTS_PAGE_TAB_URLS } from '../../urls/navigation';
import { ALL_HOSTS_TABLE } from '../../screens/hosts/all_hosts';
import { ALL_USERS_TABLE } from '../../screens/users/all_users';

describe('Pagination', () => {
  before(() => {
    login();
  });

  describe('Host uncommon processes table)', () => {
    before(() => {
      esArchiverLoad('host_uncommon_processes');
    });

    beforeEach(() => {
      visit(HOSTS_PAGE_TAB_URLS.uncommonProcesses);
      waitForUncommonProcessesToBeLoaded();
    });

    after(() => {
      esArchiverUnload('host_uncommon_processes');
    });

    it('pagination updates results and page number', () => {
      cy.get(UNCOMMON_PROCESSES_TABLE)
        .find(FIRST_PAGE_SELECTOR)
        .should('have.attr', 'aria-current');

      cy.get(UNCOMMON_PROCESSES_TABLE)
        .find(PROCESS_NAME_FIELD)
        .first()
        .invoke('text')
        .then((processNameFirstPage) => {
          goToSecondPage();
          waitForUncommonProcessesToBeLoaded();
          cy.get(UNCOMMON_PROCESSES_TABLE)
            .find(PROCESS_NAME_FIELD)
            .first()
            .invoke('text')
            .should((processNameSecondPage) => {
              expect(processNameFirstPage).not.to.eq(processNameSecondPage);
            });
        });
      cy.get(UNCOMMON_PROCESSES_TABLE)
        .find(FIRST_PAGE_SELECTOR)
        .should('not.have.attr', 'aria-current');
      cy.get(UNCOMMON_PROCESSES_TABLE)
        .find(SECOND_PAGE_SELECTOR)
        .should('have.attr', 'aria-current');
    });

    it('pagination keeps track of page results when tabs change', () => {
      cy.get(UNCOMMON_PROCESSES_TABLE)
        .find(FIRST_PAGE_SELECTOR)
        .should('have.attr', 'aria-current');
      goToSecondPage();
      waitForUncommonProcessesToBeLoaded();

      cy.get(PROCESS_NAME_FIELD)
        .first()
        .invoke('text')
        .then((expectedThirdPageResult) => {
          openEvents();
          waitsForEventsToBeLoaded();
          cy.get(FIRST_PAGE_SELECTOR).should('have.attr', 'aria-current');
          openUncommonProcesses();
          waitForUncommonProcessesToBeLoaded();
          cy.get(SECOND_PAGE_SELECTOR).should('have.attr', 'aria-current');
          cy.get(PROCESS_NAME_FIELD)
            .first()
            .invoke('text')
            .should((actualThirdPageResult) => {
              expect(expectedThirdPageResult).to.eq(actualThirdPageResult);
            });
        });
    });

    it('pagination resets results and page number to first page when refresh is clicked', () => {
      cy.get(UNCOMMON_PROCESSES_TABLE)
        .find(FIRST_PAGE_SELECTOR)
        .should('have.attr', 'aria-current');
      goToSecondPage();
      waitForUncommonProcessesToBeLoaded();
      cy.get(UNCOMMON_PROCESSES_TABLE)
        .find(FIRST_PAGE_SELECTOR)
        .should('not.have.attr', 'aria-current');
      refreshPage();
      waitForUncommonProcessesToBeLoaded();
      cy.get(UNCOMMON_PROCESSES_TABLE)
        .find(FIRST_PAGE_SELECTOR)
        .should('have.attr', 'aria-current');
    });
  });

  describe('All users and all Hosts tables', () => {
    before(() => {
      esArchiverLoad('all_users');
    });

    after(() => {
      esArchiverUnload('all_users');
    });

    it(`reset all Hosts pagination when sorting column`, () => {
      visit(HOSTS_URL);
      goToSecondPage();
      cy.get(ALL_HOSTS_TABLE).find(FIRST_PAGE_SELECTOR).should('not.have.attr', 'aria-current');

      sortFirstColumn();

      cy.get(ALL_HOSTS_TABLE).find(FIRST_PAGE_SELECTOR).should('have.attr', 'aria-current');
    });

    it(`reset all users pagination when sorting column`, () => {
      visit(USERS_URL);
      goToSecondPage();
      cy.get(ALL_USERS_TABLE).find(FIRST_PAGE_SELECTOR).should('not.have.attr', 'aria-current');

      sortFirstColumn();

      cy.get(ALL_USERS_TABLE).find(FIRST_PAGE_SELECTOR).should('have.attr', 'aria-current');
    });
  });
});
