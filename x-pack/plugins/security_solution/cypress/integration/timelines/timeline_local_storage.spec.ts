/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cleanKibana, reload } from '../../tasks/common';
import { loginAndWaitForPage } from '../../tasks/login';
import { HOSTS_URL } from '../../urls/navigation';
import { openEvents } from '../../tasks/hosts/main';
import { DRAGGABLE_HEADER } from '../../screens/timeline';
import { TABLE_COLUMN_EVENTS_MESSAGE } from '../../screens/hosts/external_events';
import { waitsForEventsToBeLoaded } from '../../tasks/hosts/events';
import { removeColumn } from '../../tasks/timeline';

describe('persistent timeline', () => {
  beforeEach(() => {
    cleanKibana();
    loginAndWaitForPage(HOSTS_URL);
    openEvents();
    waitsForEventsToBeLoaded();
    cy.get(DRAGGABLE_HEADER).then((header) =>
      cy.wrap(header.length - 1).as('expectedNumberOfTimelineColumns')
    );
  });

  it('persist the deletion of a column', function () {
    cy.get(DRAGGABLE_HEADER).eq(TABLE_COLUMN_EVENTS_MESSAGE).should('have.text', 'message');
    removeColumn(TABLE_COLUMN_EVENTS_MESSAGE);

    cy.get(DRAGGABLE_HEADER).should('have.length', this.expectedNumberOfTimelineColumns);

    reload();
    waitsForEventsToBeLoaded();

    cy.get(DRAGGABLE_HEADER).should('have.length', this.expectedNumberOfTimelineColumns);
    cy.get(DRAGGABLE_HEADER).each(($el) => expect($el.text()).not.equal('message'));
  });
});
