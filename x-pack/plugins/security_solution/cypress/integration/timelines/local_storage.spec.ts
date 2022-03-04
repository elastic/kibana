/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cleanKibana, reload } from '../../tasks/common';
import { loginAndWaitForPage } from '../../tasks/login';
import { HOSTS_URL } from '../../urls/navigation';
import { openEvents } from '../../tasks/hosts/main';
import { DATAGRID_HEADERS } from '../../screens/timeline';
import { waitsForEventsToBeLoaded } from '../../tasks/hosts/events';
import { removeColumn } from '../../tasks/timeline';

// TODO: Fix bug in persisting the columns of timeline
describe.skip('persistent timeline', () => {
  beforeEach(() => {
    cleanKibana();
    loginAndWaitForPage(HOSTS_URL);
    openEvents();
    waitsForEventsToBeLoaded();
    cy.get(DATAGRID_HEADERS).then((header) =>
      cy.wrap(header.length - 1).as('expectedNumberOfTimelineColumns')
    );
  });

  it('persist the deletion of a column', function () {
    const MESSAGE_COLUMN = 'message';
    const MESSAGE_COLUMN_POSITION = 2;

    cy.get(DATAGRID_HEADERS).eq(MESSAGE_COLUMN_POSITION).should('have.text', MESSAGE_COLUMN);
    removeColumn(MESSAGE_COLUMN);

    cy.get(DATAGRID_HEADERS).should('have.length', this.expectedNumberOfTimelineColumns);

    reload();
    waitsForEventsToBeLoaded();

    cy.get(DATAGRID_HEADERS).should('have.length', this.expectedNumberOfTimelineColumns);
    cy.get(DATAGRID_HEADERS).each(($el) => expect($el.text()).not.equal(MESSAGE_COLUMN));
  });
});
