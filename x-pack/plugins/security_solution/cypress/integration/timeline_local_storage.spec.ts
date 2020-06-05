/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { reload } from '../tasks/common';
import { loginAndWaitForPage } from '../tasks/login';
import { HOSTS_PAGE } from '../urls/navigation';
import { openEvents } from '../tasks/hosts/main';
import { DRAGGABLE_HEADER } from '../screens/timeline';
import { TABLE_COLUMN_EVENTS_MESSAGE } from '../screens/hosts/external_events';
import { waitsForEventsToBeLoaded, openEventsViewerFieldsBrowser } from '../tasks/hosts/events';
import { removeColumn, resetFields } from '../tasks/timeline';

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
    reload(waitsForEventsToBeLoaded);
    cy.get(DRAGGABLE_HEADER).each(($el) => {
      expect($el.text()).not.equal('message');
    });
  });
});
