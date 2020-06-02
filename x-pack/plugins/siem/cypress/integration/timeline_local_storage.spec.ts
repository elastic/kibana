/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { loginAndWaitForPage } from '../tasks/login';
import { HOSTS_PAGE } from '../urls/navigation';
import { openEvents } from '../tasks/hosts/main';
import { DRAGGABLE_HEADER, ITEMS_PER_PAGE, ROWS, COLUMNS } from '../screens/timeline';
import {
  TABLE_COLUMN_EVENTS_MESSAGE,
  TABLE_COLUMN_EVENTS_HOSTNAME,
} from '../screens/hosts/external_events';
import { waitsForEventsToBeLoaded, openEventsViewerFieldsBrowser } from '../tasks/hosts/events';
import {
  removeColumn,
  addIdColumn,
  resetFields,
  sortByColumn,
  changeItemsPerPage,
} from '../tasks/timeline';

describe('persistent timeline', () => {
  before(() => {
    loginAndWaitForPage(HOSTS_PAGE);
    openEvents();
    waitsForEventsToBeLoaded();
  });

  afterEach(() => {
    openEventsViewerFieldsBrowser();
    resetFields();
  });

  it('persist the deletion of a column', () => {
    cy.get(DRAGGABLE_HEADER)
      .eq(TABLE_COLUMN_EVENTS_MESSAGE)
      .invoke('text')
      .should('equal', 'message');
    removeColumn(TABLE_COLUMN_EVENTS_MESSAGE);
    cy.reload();
    cy.get(DRAGGABLE_HEADER).each(($el) => {
      expect($el.text()).not.equal('message');
    });
  });

  it('persist the addition of a column', () => {
    addIdColumn();
    cy.reload();
    cy.get(DRAGGABLE_HEADER).eq(1).invoke('text').should('equal', '_id');
  });

  it('persist when resetting the fields', () => {
    removeColumn(TABLE_COLUMN_EVENTS_MESSAGE);
    cy.get(DRAGGABLE_HEADER).should('have.length', 8);
    openEventsViewerFieldsBrowser();
    resetFields();
    cy.wait(3000);
    cy.reload();
    cy.get(DRAGGABLE_HEADER).then(($items) => {
      expect($items).to.have.length(9);
      expect($items).to.contain('message');
    });
  });

  it('persist the total items per page', () => {
    changeItemsPerPage(50);
    cy.reload();
    cy.get(ITEMS_PER_PAGE).invoke('text').should('eql', '50');
  });

  it('persist sorting', () => {
    changeItemsPerPage(10);
    waitsForEventsToBeLoaded();
    sortByColumn(TABLE_COLUMN_EVENTS_HOSTNAME - 1);
    cy.wait(3000);
    cy.reload();
    waitsForEventsToBeLoaded();

    cy.get(ROWS).each(($el) => {
      cy.wrap($el)
        .find(COLUMNS)
        .children()
        .eq(TABLE_COLUMN_EVENTS_HOSTNAME)
        .invoke('text')
        .should('equal', 'suricata-iowa');
    });
  });
});
