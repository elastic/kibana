/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIMELINE_BOTTOM_BAR_TOGGLE_BUTTON } from '../../screens/security_main';
import {
  CREATE_NEW_TIMELINE,
  TIMELINE_FLYOUT_HEADER,
  TIMELINE_SETTINGS_ICON,
} from '../../screens/timeline';
import { cleanKibana } from '../../tasks/common';

import { waitForAllHostsToBeLoaded } from '../../tasks/hosts/all_hosts';
import { login, visit } from '../../tasks/login';
import {
  closeTimelineUsingCloseButton,
  closeTimelineUsingToggle,
  openTimelineUsingToggle,
} from '../../tasks/security_main';

import { HOSTS_URL } from '../../urls/navigation';

describe('timeline flyout button', () => {
  before(() => {
    cleanKibana();
    login();
    visit(HOSTS_URL);
    waitForAllHostsToBeLoaded();
  });

  it('toggles open the timeline', () => {
    openTimelineUsingToggle();
    cy.get(TIMELINE_FLYOUT_HEADER).should('have.css', 'visibility', 'visible');
    closeTimelineUsingToggle();
  });

  it('re-focuses the toggle button when timeline is closed by clicking the active timeline toggle button', () => {
    openTimelineUsingToggle();
    closeTimelineUsingToggle();

    cy.get(TIMELINE_BOTTOM_BAR_TOGGLE_BUTTON).should('have.focus');
  });

  it('re-focuses the toggle button when timeline is closed by clicking the [X] close button', () => {
    openTimelineUsingToggle();
    closeTimelineUsingCloseButton();

    cy.get(TIMELINE_BOTTOM_BAR_TOGGLE_BUTTON).should('have.focus');
  });

  it('re-focuses the toggle button when timeline is closed by pressing the Esc key', () => {
    openTimelineUsingToggle();
    cy.get('body').type('{esc}');

    cy.get(TIMELINE_BOTTOM_BAR_TOGGLE_BUTTON).should('have.focus');
  });

  it('the `(+)` button popover menu owns focus', () => {
    cy.get(TIMELINE_SETTINGS_ICON).filter(':visible').click({ force: true });
    cy.get(`${CREATE_NEW_TIMELINE}`)
      .pipe(($el) => $el.trigger('focus'))
      .should('have.focus');
    cy.get(TIMELINE_SETTINGS_ICON).filter(':visible').type('{esc}');
    cy.get(CREATE_NEW_TIMELINE).should('not.be.visible');
  });

  it('should render the global search dropdown when the input is focused', () => {
    openTimelineUsingToggle();
    cy.get('[data-test-subj="nav-search-input"]').focus();
    cy.get('[data-test-subj="nav-search-input"]').should('be.focused');
    cy.get('[data-test-subj="nav-search-option"]').should('be.visible');
    cy.get('[data-test-subj="nav-search-option"]').first().trigger('mouseenter');
    // check that at least one item is visible in the search bar after mousing over, i.e. it's still usable.
    cy.get('[data-test-subj="nav-search-option"]').its('length').should('be.gte', 1);
    closeTimelineUsingCloseButton();
  });
});
