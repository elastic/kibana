/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TIMELINE_DROPPED_DATA_PROVIDERS,
  TIMELINE_DATA_PROVIDERS_ACTION_MENU,
  TIMELINE_FLYOUT_HEADER,
} from '../../screens/timeline';

import { waitForAllHostsToBeLoaded } from '../../tasks/hosts/all_hosts';

import { login, visit } from '../../tasks/login';
import { openTimelineUsingToggle } from '../../tasks/security_main';
import { addDataProvider } from '../../tasks/timeline';

import { HOSTS_URL } from '../../urls/navigation';
import { cleanKibana, scrollToBottom } from '../../tasks/common';

describe('timeline data providers', () => {
  before(() => {
    cleanKibana();
    login();
    visit(HOSTS_URL);
    waitForAllHostsToBeLoaded();
    scrollToBottom();
  });

  it('displays the data provider action menu when Enter is pressed', (done) => {
    openTimelineUsingToggle();
    addDataProvider({ field: 'host.name', operator: 'exists' }).then(() => {
      cy.get(TIMELINE_DATA_PROVIDERS_ACTION_MENU).should('not.exist');

      cy.get(`${TIMELINE_FLYOUT_HEADER} ${TIMELINE_DROPPED_DATA_PROVIDERS}`)
        .pipe(($el) => $el.trigger('focus'))
        .should('exist');
      cy.get(`${TIMELINE_FLYOUT_HEADER} ${TIMELINE_DROPPED_DATA_PROVIDERS}`)
        .first()
        .parent()
        .type('{enter}');

      cy.get(TIMELINE_DATA_PROVIDERS_ACTION_MENU).should('exist');
      done();
    });
  });
});
