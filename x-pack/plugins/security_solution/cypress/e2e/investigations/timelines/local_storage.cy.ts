/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { tag } from '../../../tags';

import { reload } from '../../../tasks/common';
import { login, visit } from '../../../tasks/login';
import { HOSTS_URL } from '../../../urls/navigation';
import { openEvents } from '../../../tasks/hosts/main';
import { DATAGRID_HEADERS, DATAGRID_HEADER } from '../../../screens/timeline';
import { waitsForEventsToBeLoaded } from '../../../tasks/hosts/events';
import { removeColumn } from '../../../tasks/timeline';

describe('persistent timeline', { tags: [tag.ESS, tag.SERVERLESS] }, () => {
  before(() => {
    login();
    visit(HOSTS_URL);
    openEvents();
    waitsForEventsToBeLoaded();

    /* Stores in 'expectedNumberOfTimelineColumns' alias the number of columns we are going to have
    after the delition of the column */
    cy.get(DATAGRID_HEADERS).then((header) =>
      cy.wrap(header.length - 1).as('expectedNumberOfTimelineColumns')
    );
  });

  it('persist the deletion of a column', { tags: tag.BROKEN_IN_SERVERLESS }, function () {
    /* For testing purposes we are going to use the message column */
    const COLUMN = 'message';

    cy.get(DATAGRID_HEADER(COLUMN)).should('exist');
    removeColumn(COLUMN);
    reload();
    waitsForEventsToBeLoaded();

    /* After the deletion of the message column and the reload of the page, we make sure
    we have the expected number of columns and that the message column is not displayed */
    cy.get(DATAGRID_HEADERS).should('have.length', this.expectedNumberOfTimelineColumns);
    cy.get(DATAGRID_HEADER(COLUMN)).should('not.exist');
  });
});
